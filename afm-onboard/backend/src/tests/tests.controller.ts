import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Get('courses/:courseId/test')
  async getByCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.tests.getTestByCourse(courseId, req.user.userId);
  }

  @Get('chapters/:chapterId/test')
  async getByChapter(@Param('chapterId') chapterId: string, @Req() req: any) {
    return this.tests.getTestByChapter(chapterId, req.user.userId);
  }

  @Get('lessons/:lessonId/test')
  async getByLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.tests.getTestByLesson(lessonId, req.user.userId);
  }

  @Post('tests/:testId/attempts')
  async createAttempt(@Param('testId') testId: string, @Req() req: any) {
    return this.tests.createAttempt(testId, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  async submit(
    @Param('attemptId') attemptId: string,
    @Body() body: { answers: { questionId: string; answerIds: string[] }[] },
  ) {
    return this.tests.submitAttempt(attemptId, body.answers);
  }

  // ADMIN: test create/update and questions CRUD
  @Post('courses/:courseId/test')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsertCourseTest(
    @Param('courseId') courseId: string,
    @Body() body: { passScore?: number | null; timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean },
  ) {
    return this.tests.upsertCourseTest(courseId, body);
  }

  @Post('chapters/:chapterId/test')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsertTest(
    @Param('chapterId') chapterId: string,
    @Body() body: { timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean },
  ) {
    return this.tests.upsertTest(chapterId, body);
  }

  @Post('lessons/:lessonId/test')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsertLessonTest(
    @Param('lessonId') lessonId: string,
    @Body() body: { passScore?: number | null; timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean; isMandatory?: boolean },
  ) {
    return this.tests.upsertLessonTest(lessonId, body);
  }

  @Post('tests/:testId/questions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  addQuestions(
    @Param('testId') testId: string,
    @Body() body: { questions: { type: 'SINGLE'|'MULTI'|'BOOLEAN'; text: string; sectionId?: string | null; points?: number; answers?: { text: string; isCorrect: boolean }[]; booleanCorrect?: boolean }[] },
  ) {
    return this.tests.addQuestions(testId, body.questions);
  }

  @Patch('tests/:testId/questions/reorder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  reorderQuestions(
    @Param('testId') testId: string,
    @Body() body: { order: { id: string; sortIndex: number }[] },
  ) {
    return this.tests.reorderQuestions(testId, body.order);
  }

  @Patch('questions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateQuestion(@Param('id') id: string, @Body() body: Partial<{ type: 'SINGLE'|'MULTI'|'BOOLEAN'; text: string; sectionId?: string | null; points?: number }>) {
    return this.tests.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteQuestion(@Param('id') id: string) {
    return this.tests.deleteQuestion(id);
  }

  @Post('tests/:testId/preview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  preview(@Param('testId') testId: string, @Req() req: any) {
    return this.tests.previewItems(testId, req.user.userId);
  }

  // ADMIN: get raw questions (no shuffle) with answers ordered by sortIndex
  @Get('tests/:testId/questions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listRawQuestions(@Param('testId') testId: string) {
    return this.tests.listQuestions(testId);
  }



  // Sections CRUD
  @Get('tests/:testId/sections')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listSections(@Param('testId') testId: string) {
    return this.tests.listSections(testId);
  }

  @Post('tests/:testId/sections')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  upsertSections(
    @Param('testId') testId: string,
    @Body() body: { sections: { id?: string; title: string; description?: string; sortIndex: number }[] },
  ) {
    return this.tests.upsertSections(testId, body.sections);
  }

  @Patch('sections/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateSection(
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; description?: string; sortIndex: number }>,
  ) {
    return this.tests.updateSection(id, body);
  }

  @Delete('sections/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteSection(@Param('id') id: string) {
    return this.tests.deleteSection(id);
  }

  @Patch('tests/:testId/sections/reorder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  reorderSections(
    @Param('testId') testId: string,
    @Body() body: { order: { id: string; sortIndex: number }[] },
  ) {
    return this.tests.reorderSections(testId, body.order);
  }
}


