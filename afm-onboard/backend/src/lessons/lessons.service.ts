import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  list(chapterId: string) {
    return this.prisma.lesson.findMany({
      where: { chapterId },
      orderBy: { orderIndex: 'asc' },
      include: { contents: { orderBy: { sortIndex: 'asc' } } },
    });
  }

  async listWithProgress(chapterId: string, userId: string) {
    // Проверяем статус пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });
    if (!user || user.status !== 'APPROVED') {
      throw new ForbiddenException({ 
        code: 'USER_NOT_APPROVED', 
        message: 'Ваша учетная запись не подтверждена администратором.' 
      });
    }

    const items = await this.list(chapterId);
    const progresses = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: items.map((i) => i.id) } },
      select: { lessonId: true, completed: true }
    });
    const byId = new Map(progresses.map((p) => [p.lessonId, p.completed] as [string, boolean]));
    return items.map((i) => {
      const completed = byId.get(i.id);
      return { ...i, progress: completed !== undefined ? { completed } : undefined };
    });
  }

  get(lessonId: string) {
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { contents: { orderBy: { sortIndex: 'asc' } } },
    });
  }

  listContents(lessonId: string) {
    return this.prisma.lessonContent.findMany({ where: { lessonId }, orderBy: { sortIndex: 'asc' } });
  }

  async getWithProgress(lessonId: string, userId: string) {
    // Проверяем статус пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });
    if (!user || user.status !== 'APPROVED') {
      throw new ForbiddenException({ 
        code: 'USER_NOT_APPROVED', 
        message: 'Ваша учетная запись не подтверждена администратором.' 
      });
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { contents: { orderBy: { sortIndex: 'asc' } }, test: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Gating: запрет доступа к уроку, если предыдущие уроки главы не завершены пользователем
    const prevLessons = await this.prisma.lesson.findMany({
      where: { chapterId: lesson.chapterId, orderIndex: { lt: lesson.orderIndex } },
      select: { id: true },
      orderBy: { orderIndex: 'asc' },
    });

    if (prevLessons.length > 0) {
      const progress = await this.prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: prevLessons.map((l) => l.id) } },
        select: { lessonId: true, completed: true },
      });
      const completedSet = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
      const allPrevCompleted = prevLessons.every((l) => completedSet.has(l.id));
      if (!allPrevCompleted) {
        throw new ForbiddenException({ code: 'LESSON_LOCKED', message: 'Доступ к уроку закрыт до просмотра предыдущих уроков.' });
      }
    }

    const lp = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const progress = lp
      ? { completed: lp.completed, videoProgress: lp.videoProgress as any }
      : null;

    const testMeta = lesson.test
      ? {
          id: (lesson.test as any).id,
          isPublished: (lesson.test as any).isPublished === true,
          isMandatory: (lesson.test as any).isMandatory === true,
        }
      : null;
    const withoutTest = { ...lesson, test: undefined } as any;
    return { ...withoutTest, testMeta, progress };
  }

  create(chapterId: string, data: { orderIndex: number; title: string; description?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const ch = await tx.chapter.findUnique({ where: { id: chapterId }, select: { courseId: true } });
      if (!ch) throw new NotFoundException('Chapter not found');
      if (ch.courseId) {
        const course = await tx.course.findUnique({ where: { id: ch.courseId } });
        if (course) {
          const seriesId = (course as any).seriesId || course.id;
          const last = await tx.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
          if (((course as any).version ?? 0) < ((last as any)?.version ?? 0)) {
            throw new ForbiddenException('Editing locked for non-latest course version');
          }
        }
      }
      return tx.lesson.create({ data: { chapterId, orderIndex: data.orderIndex, title: data.title, description: data.description ?? null } });
    });
  }

  update(lessonId: string, data: Partial<{ orderIndex: number; title: string; description?: string }>) {
    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { chapterId: true } });
      if (!lesson) throw new NotFoundException('Lesson not found');
      const ch = await tx.chapter.findUnique({ where: { id: lesson.chapterId }, select: { courseId: true } });
      if (ch?.courseId) {
        const course = await tx.course.findUnique({ where: { id: ch.courseId } });
        if (course) {
          const seriesId = (course as any).seriesId || course.id;
          const last = await tx.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
          if (((course as any).version ?? 0) < ((last as any)?.version ?? 0)) {
            throw new ForbiddenException('Editing locked for non-latest course version');
          }
        }
      }
      return tx.lesson.update({ where: { id: lessonId }, data });
    });
  }

  remove(lessonId: string) {
    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { chapterId: true } });
      if (!lesson) throw new NotFoundException('Lesson not found');
      const ch = await tx.chapter.findUnique({ where: { id: lesson.chapterId }, select: { courseId: true } });
      if (ch?.courseId) {
        const course = await tx.course.findUnique({ where: { id: ch.courseId } });
        if (course) {
          const seriesId = (course as any).seriesId || course.id;
          const last = await tx.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
          if (((course as any).version ?? 0) < ((last as any)?.version ?? 0)) {
            throw new ForbiddenException('Editing locked for non-latest course version');
          }
        }
      }

      // Cascade delete related data: test (attempts, answers, questions, sections), contents, progresses
      const test = await tx.test.findUnique({ where: { lessonId } });
      if (test) {
        const attempts = await tx.testAttempt.findMany({ where: { testId: test.id }, select: { id: true } });
        const attemptIds = attempts.map((a) => a.id);
        if (attemptIds.length) {
          await tx.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await tx.testAttempt.deleteMany({ where: { id: { in: attemptIds } } });
        }
        const questions = await tx.question.findMany({ where: { testId: test.id }, select: { id: true } });
        const qIds = questions.map((q) => q.id);
        if (qIds.length) {
          await tx.answer.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.question.deleteMany({ where: { id: { in: qIds } } });
        }
        await tx.testSection.deleteMany({ where: { testId: test.id } });
        await tx.test.delete({ where: { id: test.id } });
      }

      await tx.lessonContent.deleteMany({ where: { lessonId } });
      await tx.lessonProgress.deleteMany({ where: { lessonId } });
      return tx.lesson.delete({ where: { id: lessonId } });
    });
  }

  async saveContents(lessonId: string, blocks: { blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[]) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { chapterId: true } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const ch = await this.prisma.chapter.findUnique({ where: { id: lesson.chapterId }, select: { courseId: true } });
    if (ch?.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: ch.courseId } });
      if (course) {
        const seriesId = (course as any).seriesId || course.id;
        const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
        if (((course as any).version ?? 0) < ((last as any)?.version ?? 0)) {
          throw new ForbiddenException('Editing locked for non-latest course version');
        }
      }
    }
    // Валидация: в одном уроке может быть не более одного VIDEO-блока
    const videoCount = blocks.filter((b) => b.blockType === 'VIDEO').length;
    if (videoCount > 1) {
      throw new BadRequestException({ code: 'MULTIPLE_VIDEO_BLOCKS_NOT_ALLOWED', message: 'В уроке может быть только один видео-блок.' });
    }

    await this.prisma.$transaction([
      this.prisma.lessonContent.deleteMany({ where: { lessonId } }),
      ...blocks.map((b) => this.prisma.lessonContent.create({ data: { lessonId, blockType: b.blockType, textHtml: b.textHtml ?? null, mediaKey: b.mediaKey ?? null, sortIndex: b.sortIndex } })),
    ]);
    return this.prisma.lessonContent.findMany({ where: { lessonId }, orderBy: { sortIndex: 'asc' } });
  }

  async updateLessonProgress(
    lessonId: string,
    userId: string,
    body: { blockId: string; watchedSec: number; durationSec: number; completed: boolean; force?: boolean },
  ) {
    // Проверяем статус пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });
    if (!user || user.status !== 'APPROVED') {
      throw new ForbiddenException({ 
        code: 'USER_NOT_APPROVED', 
        message: 'Ваша учетная запись не подтверждена администратором.' 
      });
    }

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { contents: true, test: true } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Прогресс по видео-блокам
    const videoBlocks = (lesson.contents || []).filter((c) => c.blockType === 'VIDEO');

    // Если видео нет — урок считается завершенным сразу при первом заходе/вызове
    const noVideos = videoBlocks.length === 0;

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const videoProgress: Record<string, any> = (existing?.videoProgress as any) || {};
    if (body.blockId) {
      videoProgress[body.blockId] = {
        watchedSec: Math.max(0, Math.floor(body.watchedSec || 0)),
        durationSec: Math.max(0, Math.floor(body.durationSec || 0)),
        completed: !!body.completed,
        updatedAt: new Date().toISOString(),
      };
    }

    const allVideosCompleted = noVideos || videoBlocks.every((vb) => videoProgress[vb.id]?.completed === true);
    // Если тест включён и обязательный — завершение урока только после успешного прохождения теста.
    const hasPublishedMandatoryLessonTest = !!lesson.test && (lesson.test as any).isPublished === true && ((lesson.test as any).isMandatory === true);
    let nextCompleted = hasPublishedMandatoryLessonTest ? (existing?.completed ?? false) : allVideosCompleted;
    // Скрытый хук: админ может форсировать завершение урока
    if (body.force === true) {
      const userRole = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (userRole?.role === 'ADMIN') {
        nextCompleted = true;
      }
    }

    const upserted = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        videoProgress,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      },
      update: {
        videoProgress,
        completed: nextCompleted,
        completedAt: nextCompleted && !existing?.completed ? new Date() : existing?.completedAt ?? null,
      },
    });

    return { ok: true, completed: upserted.completed };
  }
}


