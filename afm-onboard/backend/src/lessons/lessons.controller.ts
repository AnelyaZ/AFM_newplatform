import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chapters/:chapterId/lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  list(@Param('chapterId') chapterId: string, @Req() req: any) {
    return this.lessons.listWithProgress(chapterId, req.user.userId);
  }

  @Get(':lessonId')
  get(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.lessons.getWithProgress(lessonId, req.user.userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Param('chapterId') chapterId: string, @Body() body: { orderIndex: number; title: string; description?: string }) {
    return this.lessons.create(chapterId, body);
  }

  @Patch(':lessonId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('lessonId') lessonId: string, @Body() body: Partial<{ orderIndex: number; title: string; description?: string }>) {
    return this.lessons.update(lessonId, body);
  }

  @Delete(':lessonId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('lessonId') lessonId: string) {
    return this.lessons.remove(lessonId);
  }

  @Get(':lessonId/contents')
  listContents(@Param('lessonId') lessonId: string) {
    return this.lessons.listContents(lessonId);
  }

  @Post(':lessonId/contents')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  saveContents(
    @Param('lessonId') lessonId: string,
    @Body() body: { blocks: { blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[] },
  ) {
    return this.lessons.saveContents(lessonId, body.blocks);
  }

  // Обновление прогресса просмотра видео внутри урока
  @Post(':lessonId/progress')
  updateProgress(
    @Param('lessonId') lessonId: string,
    @Req() req: any,
    @Body()
    body: {
      blockId: string; // id LessonContent с VIDEO
      watchedSec: number; // сколько реально досмотрено
      durationSec: number; // длительность
      completed: boolean; // достигнут ли порог 90%
      force?: boolean; // скрытая опция для админов: форсировать завершение
    },
  ) {
    return this.lessons.updateLessonProgress(lessonId, req.user.userId, body);
  }
}


