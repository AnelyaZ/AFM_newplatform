import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    // Разрешённые курсы для пользователя
    const accesses = await this.prisma.userCourseAccess.findMany({ where: { userId }, select: { courseId: true } });
    const allowedCourseIds = accesses.map((a) => a.courseId);
    const chapters = await this.prisma.chapter.findMany({
      where: { isPublished: true, ...(allowedCourseIds.length ? { courseId: { in: allowedCourseIds } } : { courseId: '__none__' as any }) },
      orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }],
      select: { id: true, courseId: true, orderIndex: true, title: true, description: true, passScore: true },
    });

    if (chapters.length === 0) return [] as any[];

    // Готовим данные по урокам и прогрессу
    const lessons = await this.prisma.lesson.findMany({
      where: { chapterId: { in: chapters.map((c) => c.id) } },
      select: { id: true, chapterId: true },
    });
    const lessonIds = lessons.map((l) => l.id);
    const lessonProgress = lessonIds.length
      ? await this.prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true, completed: true } })
      : ([] as { lessonId: string; completed: boolean }[]);
    const completedLessons = new Set(
      lessonProgress
        .filter((p: { lessonId: string; completed: boolean }) => p.completed)
        .map((p: { lessonId: string; completed: boolean }) => p.lessonId),
    );

    const chapterToLessons = new Map<string, string[]>();
    for (const l of lessons) {
      const arr = chapterToLessons.get(l.chapterId) || [];
      arr.push(l.id);
      chapterToLessons.set(l.chapterId, arr);
    }

    // Главы, завершенные (после сдачи теста)
    const chProgress = await this.prisma.userProgress.findMany({ where: { userId, chapterId: { in: chapters.map((c) => c.id) } } });
    const completedChapters = new Set(chProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.chapterId));

    // Рассчитываем статус (LOCKED/AVAILABLE/COMPLETED) + проценты
    return chapters.map((c) => {
      const totalLessons = (chapterToLessons.get(c.id) || []).length;
      const doneLessons = (chapterToLessons.get(c.id) || []).filter((lid) => completedLessons.has(lid)).length;
      const progressPercent = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

      let status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' = 'LOCKED';
      if (completedChapters.has(c.id)) status = 'COMPLETED';
      else {
        if (c.orderIndex === 1) status = 'AVAILABLE';
        else {
          const prev = chapters.find((x) => x.courseId === c.courseId && x.orderIndex === c.orderIndex - 1);
          status = prev && completedChapters.has(prev.id) ? 'AVAILABLE' : 'LOCKED';
        }
      }

      return { ...c, status, progressPercent };
    });
  }

  async getById(chapterId: string, userId?: string) {
    // Если передан userId, проверяем статус пользователя
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true }
      });
      if (!user || user.status !== 'APPROVED') {
        throw new Error('Ваша учетная запись не подтверждена администратором.');
      }
    }

    return this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { contents: { orderBy: { sortIndex: 'asc' } } },
    });
  }

  adminListByCourse(courseId: string) {
    return this.prisma.chapter.findMany({ where: { courseId }, orderBy: { orderIndex: 'asc' } });
  }

  adminList(q?: string) {
    return this.prisma.chapter.findMany({
      where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : undefined,
      orderBy: { orderIndex: 'asc' },
    });
  }

  create(data: { courseId: string; orderIndex: number; title: string; description?: string; passScore: number; isPublished?: boolean }, actorId: string) {
    return this.prisma.chapter.create({ data: { ...data, createdById: actorId, updatedById: actorId } });
  }

  async update(id: string, data: Partial<{ orderIndex: number; title: string; description?: string; passScore: number; isPublished?: boolean }>) {
    // Разрешаем правки глав только для курса последней версии серии
    const chapter = await this.prisma.chapter.findUnique({ where: { id }, select: { courseId: true } });
    if (!chapter) throw new Error('Chapter not found');
    if (chapter.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: chapter.courseId } });
      if (!course) throw new Error('Course not found');
      const seriesId = (course.seriesId as any) || course.id;
      const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
      // Разрешаем правки, если курс — черновик (version==0)
      if ((course.version ?? 0) > 0 && (course.version ?? 0) < (last?.version ?? 0)) {
        throw new Error('Editing locked for non-latest course version');
      }
    }
    return this.prisma.chapter.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.chapter.delete({ where: { id } });
  }

  listContents(chapterId: string) {
    return this.prisma.chapterContent.findMany({ where: { chapterId }, orderBy: { sortIndex: 'asc' } });
  }

  async createContents(chapterId: string, blocks: { blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[]) {
    // Разрешаем правки содержимого только для последней версии
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId }, select: { courseId: true } });
    if (!chapter) throw new Error('Chapter not found');
    if (chapter.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: chapter.courseId } });
      if (!course) throw new Error('Course not found');
      const seriesId = (course.seriesId as any) || course.id;
      const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
      if ((course.version ?? 0) > 0 && (course.version ?? 0) < (last?.version ?? 0)) {
        throw new Error('Editing locked for non-latest course version');
      }
    }
    await this.prisma.$transaction([
      this.prisma.chapterContent.deleteMany({ where: { chapterId } }),
      ...blocks.map((b) => this.prisma.chapterContent.create({ data: { chapterId, blockType: b.blockType, textHtml: b.textHtml ?? null, mediaKey: b.mediaKey ?? null, sortIndex: b.sortIndex } })),
    ]);
    return this.listContents(chapterId);
  }

  async updateContent(blockId: string, data: Partial<{ blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }>) {
    const block = await this.prisma.chapterContent.findUnique({ where: { id: blockId }, select: { chapterId: true } });
    if (!block) throw new Error('Content block not found');
    const chapter = await this.prisma.chapter.findUnique({ where: { id: block.chapterId }, select: { courseId: true } });
    if (chapter?.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: chapter.courseId } });
      if (!course) throw new Error('Course not found');
      const seriesId = (course.seriesId as any) || course.id;
      const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
      if ((course.version ?? 0) < (last?.version ?? 0)) {
        throw new Error('Editing locked for non-latest course version');
      }
    }
    return this.prisma.chapterContent.update({ where: { id: blockId }, data });
  }

  async deleteContent(blockId: string) {
    const block = await this.prisma.chapterContent.findUnique({ where: { id: blockId }, select: { chapterId: true } });
    if (!block) throw new Error('Content block not found');
    const chapter = await this.prisma.chapter.findUnique({ where: { id: block.chapterId }, select: { courseId: true } });
    if (chapter?.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: chapter.courseId } });
      if (!course) throw new Error('Course not found');
      const seriesId = (course.seriesId as any) || course.id;
      const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
      if ((course.version ?? 0) < (last?.version ?? 0)) {
        throw new Error('Editing locked for non-latest course version');
      }
    }
    return this.prisma.chapterContent.delete({ where: { id: blockId } });
  }
}


