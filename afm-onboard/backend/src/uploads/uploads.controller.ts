import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { UploadsService } from './uploads.service';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowed =
          /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(new BadRequestException('Недопустимый тип файла'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const ext = extname(file.originalname).toLowerCase();
    const key = `${uuid()}${ext}`;

    // 1. Сохраняем в MinIO (S3)
    let s3Url: string | null = null;
    try {
      s3Url = await this.uploadsService.upload(file, key);
    } catch (e) {
      console.warn('S3 upload failed, using local storage only:', e.message);
    }

    // 2. Сохраняем локально как fallback и для раздачи через /uploads
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    writeFileSync(join(uploadsDir, key), file.buffer);

    return { key: `/uploads/${key}`, s3Url };
  }
}
