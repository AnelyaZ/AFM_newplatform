import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { UploadsService } from './uploads.service';
import { mkdirSync, renameSync, unlinkSync } from 'fs';

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `tmp-${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowed =
          /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt)$/i;
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
    const finalKey = `${uuid()}${ext}`;
    const tmpPath = file.path;
    const finalPath = join(UPLOADS_DIR, finalKey);

    // Rename temp file to final key
    renameSync(tmpPath, finalPath);

    // Try uploading to MinIO in the background (non-blocking)
    let s3Url: string | null = null;
    try {
      s3Url = await this.uploadsService.uploadFromDisk(finalPath, finalKey, file.mimetype);
    } catch (e) {
      console.warn('MinIO upload failed, serving from local disk:', (e as any).message);
    }

    return { key: `/uploads/${finalKey}`, s3Url };
  }
}
