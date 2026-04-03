import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
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

    // Курсы, на которые у пользователя есть доступ, и опубликованные
    const accesses = await this.prisma.userCourseAccess.findMany({ where: { userId }, select: { courseId: true } });
    const courseIds = accesses.map((a) => a.courseId);
    const courses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { id: { in: courseIds } },
          { isPublic: true },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, isPublished: true, version: true, isPublic: true },
    });

    if (courses.length === 0) return [] as any;

    // Собираем главы по курсам
    const allChapters = await this.prisma.chapter.findMany({
      where: { courseId: { in: courses.map((c) => c.id) } },
      select: { id: true, courseId: true },
    });
    const chaptersByCourse = new Map<string, string[]>(
      courses.map((c) => [c.id, allChapters.filter((ch) => ch.courseId === c.id).map((ch) => ch.id)]),
    );

    // Прогресс пользователя по завершённым главам и их лучшие баллы
    const chapterIds = allChapters.map((ch) => ch.id);
    const completedProgress = chapterIds.length
      ? await this.prisma.userProgress.findMany({
          where: { userId, chapterId: { in: chapterIds }, status: 'COMPLETED' },
          select: { chapterId: true, bestScore: true },
        })
      : [];

    const completedByChapter = new Map<string, number>();
    for (const p of completedProgress) completedByChapter.set(p.chapterId, p.bestScore || 0);

    // Формируем ответ с прогрессом и средним баллом
    return courses.map((c) => {
      const chIds = chaptersByCourse.get(c.id) || [];
      const totalChapters = chIds.length;
      const completedScores: number[] = chIds
        .map((id) => completedByChapter.get(id))
        .filter((v): v is number => typeof v === 'number');
      const completedChapters = completedScores.length;
      const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
      const avgScore = completedScores.length > 0
        ? Math.round(completedScores.reduce((s, v) => s + v, 0) / completedScores.length)
        : 0;
      return { ...c, progressPercent, avgScore } as any;
    });
  }

  async getCourseForUser(courseId: string, userId: string) {
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

    // Проверяем доступ: либо прямой доступ, либо курс публичный и опубликованный
    const courseForAccess = await this.prisma.course.findUnique({ where: { id: courseId }, select: { isPublic: true, isPublished: true } });
    const hasDirect = await this.prisma.userCourseAccess.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!hasDirect && !(courseForAccess?.isPublic && courseForAccess?.isPublished)) throw new NotFoundException('Course not found');
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { chapters: { orderBy: { orderIndex: 'asc' }, include: { _count: { select: { lessons: true } } } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    const seriesId = (course.seriesId as any) || course.id;
    const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    const isLatest = (course.version ?? 0) >= ((last?.version ?? 0));

    // Расчёт статуса и прогресса по главам (модулям) для текущего пользователя
    const chapterIds = (course.chapters || []).map((c) => c.id);
    const lessons = chapterIds.length ? await this.prisma.lesson.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true, chapterId: true } }) : [];
    const lessonIds = lessons.map((l) => l.id);
    const lessonProgress = lessonIds.length
      ? await this.prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true, completed: true } })
      : [];
    const completedLessons = new Set(lessonProgress.filter((p) => p.completed).map((p) => p.lessonId));
    const userChProgress = chapterIds.length
      ? await this.prisma.userProgress.findMany({ where: { userId, chapterId: { in: chapterIds } }, select: { chapterId: true, status: true, bestScore: true } })
      : [];
    const completedChapters = new Set(userChProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.chapterId));
    const bestScoreByChapter = new Map<string, number>();
    for (const p of userChProgress) bestScoreByChapter.set(p.chapterId, p.bestScore || 0);
    const chapterToLessons = new Map<string, string[]>();
    for (const l of lessons) {
      const arr = chapterToLessons.get(l.chapterId) || [];
      arr.push(l.id);
      chapterToLessons.set(l.chapterId, arr);
    }
    const chaptersWithStatus = (course.chapters || []).map((c) => {
      const ids = chapterToLessons.get(c.id) || [];
      const total = ids.length;
      const done = ids.filter((lid) => completedLessons.has(lid)).length;
      const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
      let status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' = 'LOCKED';
      if (completedChapters.has(c.id)) status = 'COMPLETED';
      else if (c.orderIndex === 1) status = 'AVAILABLE';
      else {
        const prev = (course.chapters || []).find((x) => x.orderIndex === c.orderIndex - 1);
        status = prev && completedChapters.has(prev.id) ? 'AVAILABLE' : 'LOCKED';
      }
      const bestScore = bestScoreByChapter.get(c.id) ?? 0;
      return { ...c, status, progressPercent, bestScore } as any;
    });
    return { ...course, isLatest, chapters: chaptersWithStatus } as any;
  }

  // Admin: получить курс без проверок доступа
  async adminGetCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { chapters: { orderBy: { orderIndex: 'asc' }, include: { _count: { select: { lessons: true } } } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    const seriesId = (course.seriesId as any) || course.id;
    const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    const isLatest = (course.version ?? 0) >= ((last?.version ?? 0));
    return { ...course, isLatest } as any;
  }

  async adminList(q?: string) {
    const courses = await this.prisma.course.findMany({
      where: q
        ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        isPublished: true,
        isPublic: true,
        isArchived: true,
        version: true,
      },
    });
    const withCounts = await Promise.all(
      courses.map(async (c: any) => {
        const modulesCount = await this.prisma.chapter.count({ where: { courseId: c.id } });
        const lessonsCount = await this.prisma.lesson.count({ where: { chapter: { courseId: c.id } } });
        return { ...c, modulesCount, lessonsCount } as any;
      }),
    );
    return withCounts;
  }

  async create(data: { title: string; description?: string; isPublished?: boolean; createdById: string }) {
    // создание черновика: версия 0, серия появится при первой публикации
    return this.prisma.course.create({ data: { ...data, updatedById: data.createdById, isPublished: false, version: 0, seriesId: null } });
  }

  async update(id: string, data: Partial<{ title: string; description?: string; isPublished?: boolean; isPublic?: boolean }>) {
    // Разрешаем правки только для последней версии серии (или черновика version==0)
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    const seriesId = (course.seriesId as string | null) || course.id;
    const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    const currentVersion = (course.version ?? 0);
    const lastVersion = (last?.version ?? 0);
    if (currentVersion < lastVersion) {
      throw new ForbiddenException('Editing locked for non-latest course version');
    }
    return this.prisma.course.update({ where: { id }, data });
  }

  async listPrerequisites(courseId: string) {
    try {
      const client = (this.prisma as any).coursePrerequisite;
      if (!client?.findMany) return [];
      const items = await client.findMany({
        where: { courseId },
        include: { requiredCourse: { select: { id: true, title: true, version: true, isPublished: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return (items as any[]).map((i: any) => ({ id: i.id, requiredCourse: i.requiredCourse }));
    } catch {
      return [];
    }
  }

  async setPrerequisites(courseId: string, requiredCourseIds: string[]) {
    // Править можно только для последней версии (или черновика)
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const seriesId = (course.seriesId as any) || course.id;
    const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    if ((course.version ?? 0) < ((last?.version ?? 0))) {
      throw new ForbiddenException('Editing locked for non-latest course version');
    }
    // Нельзя ставить курс сам в себя
    const filtered = Array.from(new Set(requiredCourseIds.filter((cid) => cid && cid !== courseId)));
    try {
      const client = (this.prisma as any).coursePrerequisite;
      if (!client?.deleteMany || !client?.create) {
        throw new ForbiddenException('Prerequisites feature requires DB migration and Prisma client regeneration');
      }
      await this.prisma.$transaction([
        client.deleteMany({ where: { courseId } }),
        ...filtered.map((rcId) => client.create({ data: { courseId, requiredCourseId: rcId } })),
      ]);
      return this.listPrerequisites(courseId);
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Failed to set prerequisites (ensure DB migration is applied)');
    }
  }

  async remove(id: string, force: boolean) {
    // Проверяем незавершивших пользователей
    const openUsers = await this.prisma.userProgress.findMany({
      where: { chapter: { courseId: id }, OR: [{ status: 'LOCKED' }, { status: 'AVAILABLE' }] },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      take: 50,
    });
    if (!force) {
      if (openUsers.length) {
        throw new ForbiddenException({ code: 'COURSE_NOT_COMPLETED', message: 'Есть пользователи, не завершившие курс', users: openUsers.map((u) => u.user) });
      }
      // Режим предварительной проверки: не удаляем курс, просто подтверждаем возможность удаления
      return { ok: true, canDelete: true } as any;
    }
    // Каскад: удаление зависимостей в корректном порядке (вопросы/ответы/секции/попытки → тесты → контент → уроки → главы → доступы → курс)
    const chapters = await this.prisma.chapter.findMany({ where: { courseId: id }, select: { id: true } });
    const chapterIds = chapters.map((c) => c.id);
    const lessons = chapterIds.length ? await this.prisma.lesson.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true } }) : [];
    const lessonIds = lessons.map((l) => l.id);
    const tests = await this.prisma.test.findMany({
      where: { OR: [{ courseId: id }, { chapterId: { in: chapterIds } }, { lessonId: { in: lessonIds } }] },
      select: { id: true },
    });
    const testIds = tests.map((t) => t.id);

    // Определяем, существует ли таблица CoursePrerequisite в текущей БД,
    // чтобы избежать 500 при отсутствии применённой миграции
    let prereqDeleteOp: any = this.prisma.$executeRaw`SELECT 1`;
    try {
      const existsRes = await this.prisma.$queryRaw<{ exists: boolean }[]>`SELECT to_regclass('public."CoursePrerequisite"') IS NOT NULL as "exists"`;
      const prereqTableExists = Array.isArray(existsRes) && existsRes[0]?.exists === true;
      if (prereqTableExists && (this.prisma as any).coursePrerequisite?.deleteMany) {
        prereqDeleteOp = (this.prisma as any).coursePrerequisite.deleteMany({ where: { OR: [{ courseId: id }, { requiredCourseId: id }] } });
      }
    } catch {
      // Игнорируем ошибки проверки наличия таблицы, используем no-op
      prereqDeleteOp = this.prisma.$executeRaw`SELECT 1`;
    }

    await this.prisma.$transaction([
      // Удаляем зависимые данные тестов
      this.prisma.attemptAnswer.deleteMany({ where: { attempt: { testId: { in: testIds } } } }),
      this.prisma.testAttempt.deleteMany({ where: { testId: { in: testIds } } }),
      this.prisma.answer.deleteMany({ where: { question: { testId: { in: testIds } } } }),
      this.prisma.question.deleteMany({ where: { testId: { in: testIds } } }),
      this.prisma.testSection.deleteMany({ where: { testId: { in: testIds } } }),
      this.prisma.test.deleteMany({ where: { id: { in: testIds } } }),
      // Прогресс по урокам/главам
      this.prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } }),
      this.prisma.userProgress.deleteMany({ where: { chapterId: { in: chapterIds } } }),
      // Удаляем уроки и главы
      this.prisma.lessonContent.deleteMany({ where: { lessonId: { in: lessonIds } } }),
      this.prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } }),
      this.prisma.chapterContent.deleteMany({ where: { chapterId: { in: chapterIds } } }),
      this.prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } }),
      // Прочее: пререквизиты (если таблица существует), доступы и сам курс
      prereqDeleteOp,
      this.prisma.userCourseAccess.deleteMany({ where: { courseId: id } }),
      // deleteMany чтобы не падать, если курс уже отсутствует (идемпотентность)
      this.prisma.course.deleteMany({ where: { id } }),
    ]);
    return { ok: true };
  }

  async archive(id: string, isArchived: boolean, force: boolean) {
    // Запрет архивирования, если есть незавершившие сотрудники, если не force
    if (isArchived) {
      const openUsers = await this.prisma.userProgress.findMany({
        where: { chapter: { courseId: id }, OR: [{ status: 'LOCKED' }, { status: 'AVAILABLE' }] },
        include: { user: { select: { id: true, fullName: true, email: true } } },
        take: 50,
      });
      if (openUsers.length && !force) {
        throw new ForbiddenException({ code: 'COURSE_NOT_COMPLETED', message: 'Есть пользователи, не завершившие курс', users: openUsers.map((u) => u.user) });
      }
    }
    return this.prisma.course.update({ where: { id }, data: { isArchived } });
  }

  listAccess(courseId: string) {
    return this.prisma.userCourseAccess.findMany({ where: { courseId }, include: { user: { select: { id: true, fullName: true, email: true } } } });
  }

  grantAccess(courseId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId }, select: { version: true, isPublished: true } });
      if (!course) throw new NotFoundException('Course not found');
      // запрет: до первой публикации (version==0) или в режиме редактирования (isPublished=false при version>0)
      if (course.version === 0 || course.isPublished === false) {
        throw new ForbiddenException('Cannot modify participants until course is published');
      }
      return tx.userCourseAccess.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: {},
        create: { userId, courseId },
      });
    });
  }

  revokeAccess(courseId: string, userId: string) {
    return this.prisma.userCourseAccess.delete({ where: { userId_courseId: { userId, courseId } } });
  }

  // Публикация в новую версию: создаёт новый курс (версия N+1), копирует содержимое из текущего курса (который должен быть последней версией серии)
  async publishNewVersion(courseId: string, actorId: string) {
    const base = await this.prisma.course.findUnique({ where: { id: courseId }, include: { chapters: { include: { contents: true, lessons: { include: { contents: true } } } } } });
    if (!base) throw new NotFoundException('Course not found');
    const seriesId = (base.seriesId as string | null) || base.id; // серия = исходный id, если не задана
    const lastVersion = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    // публиковать можно только из последней версии
    if ((base.version ?? 0) < (lastVersion?.version ?? 0)) {
      throw new ForbiddenException('Only the latest version can be used to create a new version');
    }
    const nextVersion = (lastVersion?.version || 0) + 1;
    // создаём новый курс как опубликованный
    const created = await this.prisma.course.create({
      data: {
        title: base.title,
        description: base.description || null,
        isPublished: true,
        version: nextVersion,
        seriesId,
        createdById: actorId,
        updatedById: actorId,
        isPublic: base.isPublic || false,
      },
    });
    // Вспомогательная функция копирования медиа (uploads)
    const { existsSync, mkdirSync, copyFileSync } = await import('fs');
    const { dirname, join, normalize, basename } = await import('path');
    const uploadsDir = join(process.cwd(), 'uploads');

    const copyMedia = (key?: string | null): string | null => {
      if (!key) return null;

      const normalizedKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');

      if (normalizedKey.includes('..') || normalizedKey.startsWith('/') || normalizedKey.startsWith('\\')) {
        console.warn(`Blocked path traversal: ${key}`);
        return null;
      }

      const safeKey = basename(normalizedKey);
      const src = join(uploadsDir, safeKey);

      if (!src.startsWith(uploadsDir)) {
        console.warn(`Invalid path: ${src}`);
        return null;
      }

      if (!existsSync(src)) return key; // нет файла — оставляем ключ как есть
      const parts = safeKey.split('.');
      const ext = parts.length > 1 ? `.${parts.pop()}` : '';
      const baseName = parts.join('.') || 'file';
      const newKey = `${baseName}-${created.id}-${Date.now()}${ext}`;
      const dst = join(uploadsDir, newKey);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      return newKey;
    };

    // Карты соответствия старых и новых идентификаторов (нужны для копирования тестов)
    const chapterIdMap = new Map<string, string>();
    const lessonIdMap = new Map<string, string>();

    // Копируем главы, содержимое и уроки с их контентом
    for (const ch of base.chapters) {
      const newChapter = await this.prisma.chapter.create({
        data: {
          courseId: created.id,
          orderIndex: ch.orderIndex,
          title: ch.title,
          description: ch.description,
          passScore: ch.passScore,
          isPublished: true,
          createdById: actorId,
          updatedById: actorId,
        },
      });
      chapterIdMap.set(ch.id, newChapter.id);
      // Содержимое главы
      for (const block of ch.contents || []) {
        await this.prisma.chapterContent.create({
          data: {
            chapterId: newChapter.id,
            blockType: block.blockType as any,
            textHtml: block.textHtml ?? null,
            mediaKey: copyMedia(block.mediaKey),
            sortIndex: block.sortIndex,
          },
        });
      }
      // Уроки и их контент
      for (const lesson of ch.lessons || []) {
        const newLesson = await this.prisma.lesson.create({
          data: {
            chapterId: newChapter.id,
            orderIndex: lesson.orderIndex,
            title: lesson.title,
            description: lesson.description ?? null,
            isPublished: true,
          },
        });
        lessonIdMap.set(lesson.id, newLesson.id);
        for (const lb of (lesson as any).contents || []) {
          await this.prisma.lessonContent.create({
            data: {
              lessonId: newLesson.id,
              blockType: lb.blockType as any,
              textHtml: lb.textHtml ?? null,
              mediaKey: copyMedia(lb.mediaKey),
              sortIndex: lb.sortIndex,
            },
          });
        }
      }
    }

    // Копируем тесты (курсовые, модульные, по урокам) вместе с секциями, вопросами и ответами
    const oldChapterIds = base.chapters.map((c) => c.id);
    const oldLessonIds = base.chapters.flatMap((c) => (c as any).lessons?.map((l: any) => l.id) || []);
    const tests = await this.prisma.test.findMany({
      where: {
        OR: [
          { courseId: base.id },
          { chapterId: { in: oldChapterIds } },
          { lessonId: { in: oldLessonIds } },
        ],
      },
      include: {
        sections: { orderBy: { sortIndex: 'asc' } },
        questions: { include: { answers: true } },
      },
    });

    for (const t of tests) {
      const target: { courseId?: string | null; chapterId?: string | null; lessonId?: string | null } = {};
      if (t.courseId) target.courseId = created.id;
      if (t.chapterId) target.chapterId = chapterIdMap.get(t.chapterId) || null;
      if (t.lessonId) target.lessonId = lessonIdMap.get(t.lessonId) || null;

      const newTest = await this.prisma.test.create({
        data: {
          ...target,
          passScore: t.passScore ?? null,
          timeLimitSec: t.timeLimitSec ?? null,
          attemptLimit: t.attemptLimit ?? null,
          questionCount: t.questionCount ?? null,
          shuffleQuestions: t.shuffleQuestions,
          shuffleAnswers: t.shuffleAnswers,
          // Публикуем тесты в опубликованной версии курса всегда
          isPublished: true,
          // поле актуально для тестов уроков; для остальных игнорируется Prisma
          ...(typeof (t as any).isMandatory === 'boolean' ? { isMandatory: (t as any).isMandatory } : {}),
        },
      });

      // Секции теста
      const sectionIdMap = new Map<string, string>();
      const sectionsSorted = (t.sections || []).slice().sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      for (const s of sectionsSorted) {
        const newS = await this.prisma.testSection.create({
          data: {
            testId: newTest.id,
            title: (s as any).title,
            description: (s as any).description ?? null,
            sortIndex: (s as any).sortIndex ?? 0,
          },
          select: { id: true },
        });
        sectionIdMap.set(s.id, newS.id);
      }

      // Вопросы и ответы
      const questionsSorted = (t.questions || []).slice().sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
      for (const q of questionsSorted) {
        const newQ = await this.prisma.question.create({
          data: {
            testId: newTest.id,
            type: q.type as any,
            text: q.text,
            sortIndex: (q as any).sortIndex ?? 0,
            points: (q as any).points ?? 1,
            sectionId: q.sectionId ? (sectionIdMap.get(q.sectionId) || null) : null,
          },
          select: { id: true },
        });
        const answersSorted = (q.answers || []).slice().sort((a: any, b: any) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
        if (answersSorted.length) {
          await this.prisma.answer.createMany({
            data: answersSorted.map((a: any) => ({ questionId: newQ.id, text: a.text, isCorrect: a.isCorrect, sortIndex: (a as any).sortIndex ?? 0 })),
          });
        }
      }
    }
    // исходный курс не изменяем (остаётся последней опубликованной версией)
    return created;
  }
}


