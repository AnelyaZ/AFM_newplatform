import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SituationsService } from './situations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class SituationsController {
  constructor(private readonly situations: SituationsService) {}

  @Get('lessons/:lessonId/situation')
  getByLesson(@Param('lessonId') lessonId: string) {
    return this.situations.getByLesson(lessonId);
  }

  @Post('lessons/:lessonId/situation')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsert(
    @Param('lessonId') lessonId: string,
    @Body() body: { title?: string; scenario?: string; passScore?: number },
  ) {
    return this.situations.upsert(lessonId, body);
  }

  @Post('lessons/:lessonId/situation/questions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  saveQuestions(
    @Param('lessonId') lessonId: string,
    @Body() body: { questions: { text: string; sortIndex: number; options: { text: string; isCorrect: boolean; sortIndex: number }[] }[] },
  ) {
    return this.situations.saveQuestions(lessonId, body.questions);
  }

  @Delete('lessons/:lessonId/situation')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('lessonId') lessonId: string) {
    return this.situations.delete(lessonId);
  }
}
