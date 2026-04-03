import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTestByCourse(courseId: string, userId?: string) {
    try {
      // Если передан userId, проверяем статус пользователя
      if (userId) {
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
      }

      const t = await this.prisma.test.findUnique({ where: { courseId } });
      if (!t) return null as any;
      // Для курсовых тестов passScore берётся из самого теста
      return {
        id: t.id,
        passScore: t.passScore ?? null,
        timeLimitSec: (t.timeLimitSec ?? 1200),
        attemptLimit: t.attemptLimit ?? null,
        questionCount: t.questionCount ?? null,
        shuffleQuestions: t.shuffleQuestions,
        shuffleAnswers: t.shuffleAnswers,
        isPublished: t.isPublished,
      } as any;
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) throw e;
      // Неожиданная ошибка — не ломаем страницу: возвращаем null
      return null as any;
    }
  }

  async getTestByChapter(chapterId: string, userId?: string) {
    try {
      // Если передан userId, проверяем статус пользователя
      if (userId) {
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
      }

      const t = await this.prisma.test.findUnique({
        where: { chapterId },
        include: { chapter: { select: { passScore: true } } },
      });
      if (!t) return null as any;
      // Для теста главы: если у теста passScore не задан — используем passScore главы
      const passScore = (t.passScore ?? null) ?? (t.chapter?.passScore ?? null);
      return {
        id: t.id,
        passScore: passScore,
        timeLimitSec: (t.timeLimitSec ?? 1200),
        attemptLimit: t.attemptLimit ?? null,
        questionCount: t.questionCount ?? null,
        shuffleQuestions: t.shuffleQuestions,
        shuffleAnswers: t.shuffleAnswers,
        isPublished: t.isPublished,
      } as any;
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) throw e;
      return null as any;
    }
  }

  async getTestByLesson(lessonId: string, userId?: string) {
    try {
      // Если передан userId, проверяем статус пользователя
      if (userId) {
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
      }

      const t = await this.prisma.test.findUnique({
        where: { lessonId },
        include: { lesson: { select: { chapter: { select: { passScore: true } } } } },
      });
      if (!t) return null as any;
      // Для теста урока: при отсутствии passScore у теста используем passScore главы урока
      const passScore = (t.passScore ?? null) ?? (t.lesson?.chapter?.passScore ?? null);
      return {
        id: t.id,
        passScore: passScore,
        timeLimitSec: (t.timeLimitSec ?? 1200),
        attemptLimit: t.attemptLimit ?? null,
        questionCount: t.questionCount ?? null,
        shuffleQuestions: t.shuffleQuestions,
        shuffleAnswers: t.shuffleAnswers,
        isPublished: t.isPublished,
        isMandatory: (t as any).isMandatory === true,
      } as any;
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) throw e;
      return null as any;
    }
  }

  async upsertTest(
    chapterId: string,
    data: { timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean },
  ) {
    // Блокируем правки теста для глав курсов версии > 0
    const ch = await this.prisma.chapter.findUnique({ where: { id: chapterId }, select: { courseId: true } });
    if (!ch) throw new NotFoundException('Chapter not found');
    if (ch.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: ch.courseId } });
      if (!course) throw new NotFoundException('Course not found');
      const seriesId = (course.seriesId as any) || course.id;
      const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
      // Разрешаем правки, если курс — черновик (version == 0)
      if ((course.version ?? 0) > 0 && (course.version ?? 0) < (last?.version ?? 0)) {
        throw new ForbiddenException('Editing locked for non-latest course version');
      }
    }
    return this.prisma.test.upsert({ where: { chapterId }, update: data, create: { chapterId, ...data } });
  }

  async upsertLessonTest(
    lessonId: string,
    data: { passScore?: number | null; timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean; isMandatory?: boolean },
  ) {
    return this.prisma.test.upsert({
      where: { lessonId },
      update: data,
      create: { lessonId, ...data },
    });
  }

  async upsertCourseTest(
    courseId: string,
    data: { passScore?: number | null; timeLimitSec?: number | null; attemptLimit?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean },
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const seriesId = (course.seriesId as any) || course.id;
    const last = await this.prisma.course.findFirst({ where: { seriesId }, orderBy: { version: 'desc' } });
    if ((course.version ?? 0) < (last?.version ?? 0)) {
      throw new ForbiddenException('Editing locked for non-latest course version');
    }
    return this.prisma.test.upsert({ where: { courseId }, update: data, create: { courseId, ...data } });
  }

  async addQuestions(
    testId: string,
    questions: { type: 'SINGLE' | 'MULTI' | 'BOOLEAN'; text: string; sectionId?: string | null; points?: number; answers?: { text: string; isCorrect: boolean }[]; booleanCorrect?: boolean }[],
  ) {
    await this.prisma.$transaction(
      questions.map((q, idx) => {
        // Базовые поля + корректировка баллов для MULTI (минимум 2)
        const computedPoints = q.type === 'MULTI' ? Math.max(2, q.points ?? 2) : (q.points ?? 1);
        const base = {
          testId,
          type: q.type as any,
          text: q.text,
          sortIndex: idx + 1,
          sectionId: q.sectionId ?? null,
          points: computedPoints,
        };
        if (q.type === 'BOOLEAN') {
          return this.prisma.question.create({
            data: {
              ...base,
              answers: {
                createMany: {
                  data: [
                    { text: 'Правда', isCorrect: q.booleanCorrect === true, sortIndex: 1 },
                    { text: 'Ложь', isCorrect: q.booleanCorrect === false, sortIndex: 2 },
                  ],
                },
              },
            },
          });
        }
        const answers = (q.answers ?? []).slice(0, 8);
        // Валидации по количеству правильных вариантов
        const correctCount = answers.filter((a) => a.isCorrect).length;
        if (q.type === 'SINGLE') {
          if (correctCount !== 1) {
            throw new ForbiddenException('Для вопросов SINGLE должен быть ровно один правильный вариант');
          }
        }
        if (q.type === 'MULTI') {
          if (correctCount < 2 || correctCount > 3) {
            throw new ForbiddenException('Для MULTI количество правильных вариантов должно быть 2 или 3');
          }
        }
        return this.prisma.question.create({
          data: {
            ...base,
            answers: { createMany: { data: answers.map((a, j) => ({ text: a.text, isCorrect: a.isCorrect, sortIndex: j + 1 })) } },
          },
        });
      }),
    );
    return this.prisma.question.findMany({ where: { testId }, include: { answers: true }, orderBy: { sortIndex: 'asc' } });
  }

  async updateQuestion(id: string, data: Partial<{ type: 'SINGLE' | 'MULTI' | 'BOOLEAN'; text: string; sectionId?: string | null; points?: number }>) {
    // Обеспечиваем минимум 2 балла для MULTI при обновлении
    const existing = await this.prisma.question.findUnique({ where: { id }, select: { type: true, points: true } });
    if (!existing) throw new NotFoundException('Question not found');
    const newType = (data.type ?? existing.type) as 'SINGLE' | 'MULTI' | 'BOOLEAN';
    const patched: any = { ...data };
    const nextPoints = typeof data.points === 'number' ? data.points : (existing.points as number | null) ?? 1;
    patched.points = newType === 'MULTI' ? Math.max(2, nextPoints) : nextPoints;
    return this.prisma.question.update({ where: { id }, data: patched });
  }

  async deleteQuestion(id: string) {
    await this.prisma.answer.deleteMany({ where: { questionId: id } });
    return this.prisma.question.delete({ where: { id } });
  }

  async reorderQuestions(testId: string, order: { id: string; sortIndex: number }[]) {
    await this.prisma.$transaction(
      order.map((o) => this.prisma.question.update({ where: { id: o.id }, data: { sortIndex: o.sortIndex } })),
    );
    return this.prisma.question.findMany({ where: { testId }, orderBy: { sortIndex: 'asc' } });
  }

  async upsertSections(testId: string, sections: { id?: string; title: string; description?: string; sortIndex: number }[]) {
    // Простая стратегия: для секций с id — update, без id — create
    const ops = sections.map((s) =>
      s.id
        ? this.prisma.testSection.update({ where: { id: s.id }, data: { title: s.title, description: s.description ?? null, sortIndex: s.sortIndex } })
        : this.prisma.testSection.create({ data: { testId, title: s.title, description: s.description ?? null, sortIndex: s.sortIndex } }),
    );
    await this.prisma.$transaction(ops);
    return this.prisma.testSection.findMany({ where: { testId }, orderBy: { sortIndex: 'asc' } });
  }

  listSections(testId: string) {
    return this.prisma.testSection.findMany({ where: { testId }, orderBy: { sortIndex: 'asc' } });
  }

  updateSection(id: string, body: Partial<{ title: string; description?: string; sortIndex: number }>) {
    return this.prisma.testSection.update({ where: { id }, data: body });
  }

  deleteSection(id: string) {
    return this.prisma.testSection.delete({ where: { id } });
  }

  async reorderSections(testId: string, order: { id: string; sortIndex: number }[]) {
    await this.prisma.$transaction(order.map((o) => this.prisma.testSection.update({ where: { id: o.id }, data: { sortIndex: o.sortIndex } })));
    return this.prisma.testSection.findMany({ where: { testId }, orderBy: { sortIndex: 'asc' } });
  }

  async createAttempt(testId: string, userId: string) {
    // Проверяем статус пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'APPROVED') {
      throw new ForbiddenException({ 
        code: 'USER_NOT_APPROVED', 
        message: 'Ваша учетная запись не подтверждена администратором.' 
      });
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
        chapter: { include: { lessons: { include: { contents: true } } } },
        lesson: { include: { contents: true, chapter: { include: { lessons: { select: { id: true } } } } } },
        sections: { orderBy: { sortIndex: 'asc' } },
        questions: { include: { answers: true } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (!test.isPublished) throw new ForbiddenException({ code: 'TEST_NOT_PUBLISHED', message: 'Тест не опубликован.' });

    // Проверка доступа:
    // - если тест у урока: требуется завершение всех предыдущих уроков главы и текущего урока
    // - если тест у главы: требуется завершение всех уроков главы
    // - если тест у курса: доступ по курсу (в данной версии без доп. условий)
    if (test.lesson) {
      const chapterLessonIds = (test.lesson.chapter?.lessons || []).map((l) => l.id);
      const progresses = await this.prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: chapterLessonIds } },
        select: { lessonId: true, completed: true },
      });
      const completedSet = new Set(progresses.filter((p) => p.completed).map((p) => p.lessonId));
      // все уроки с orderIndex < текущего должны быть завершены. Если тест обязательный — текущий урок может быть не завершён по видео.
      const currentOrderIndex = test.lesson.orderIndex;
      const prevLessons = await this.prisma.lesson.findMany({
        where: { chapterId: test.lesson.chapterId, orderIndex: { lt: currentOrderIndex } },
        select: { id: true },
        orderBy: { orderIndex: 'asc' },
      });
      const allPrevCompleted = prevLessons.every((l) => completedSet.has(l.id));
      const isMandatory = (test as any).isMandatory === true;
      const currentCompleted = completedSet.has(test.lessonId!);
      if (!allPrevCompleted || (!currentCompleted && !isMandatory)) {
        throw new ForbiddenException({ code: 'LESSON_NOT_COMPLETED', message: 'Завершите урок перед прохождением теста.' });
      }
    } else if (test.chapter) {
      const lessonIds = test.chapter.lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
      const progresses = await this.prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessonIds } },
        select: { lessonId: true, completed: true },
      });
      const completedSet = new Set(progresses.filter((p) => p.completed).map((p) => p.lessonId));
      const allLessonsCompleted = lessonIds.every((lid) => completedSet.has(lid));
      if (!allLessonsCompleted) {
        throw new ForbiddenException({ code: 'CHAPTER_NOT_COMPLETED', message: 'Пройдите все уроки главы, чтобы начать тест.' });
      }
      }
    }

    let questions = test.questions;
    if (test.questionCount && test.questionCount > 0 && test.questionCount < questions.length) {
      questions = shuffle(questions).slice(0, test.questionCount);
    }
    if (test.shuffleQuestions) questions = shuffle(questions);

    const snapshot: { questions: { qid: string; type: typeof test.questions[number]['type']; answers: { aid: string }[]; points: number; sectionId?: string | null }[] } = {
      questions: questions.map((q) => ({
        qid: q.id,
        type: q.type,
        points: q.points,
        sectionId: q.sectionId ?? null,
        answers: (test.shuffleAnswers ? shuffle(q.answers) : q.answers).map((a) => ({ aid: a.id })),
      })),
    };

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        questionSnapshot: snapshot as any,
      },
      select: { id: true },
    });

    const items = questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      sectionId: q.sectionId ?? null,
      options: snapshot.questions
        .find((s) => s.qid === q.id)!
        .answers.map((a) => ({ answerId: a.aid, text: q.answers.find((x) => x.id === a.aid)!.text })),
    }));

    return { attemptId: attempt.id, timeLimitSec: (test.timeLimitSec ?? 1200), items };
  }

  async previewItems(testId: string, userId?: string) {
    // Если передан userId, проверяем статус пользователя
    if (userId) {
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
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        sections: { orderBy: { sortIndex: 'asc' } },
        questions: { include: { answers: true } },
        chapter: { select: { passScore: true } },
        lesson: { select: { chapter: { select: { passScore: true } } } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');
    let questions = test.questions;
    if (test.questionCount && test.questionCount > 0 && test.questionCount < questions.length) {
      questions = shuffle(questions).slice(0, test.questionCount);
    }
    if (test.shuffleQuestions) questions = shuffle(questions);
    const snapshot = {
      questions: questions.map((q) => ({ qid: q.id, points: q.points, sectionId: q.sectionId ?? null, answers: (test.shuffleAnswers ? shuffle(q.answers) : q.answers).map((a) => ({ aid: a.id })) })),
    };
    const items = questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      sectionId: q.sectionId ?? null,
      options: snapshot.questions
        .find((s) => s.qid === q.id)!
        .answers.map((a) => ({ answerId: a.aid, text: q.answers.find((x) => x.id === a.aid)!.text })),
    }));
    const passScore = (test.passScore ?? null) ?? (test.chapter?.passScore ?? null) ?? (test.lesson?.chapter?.passScore ?? null);
    return { attemptId: null, timeLimitSec: (test.timeLimitSec ?? 1200), passScore, items } as any;
  }

  // raw list for admin editor (no shuffle)
  async listQuestions(testId: string) {
    const questions = await this.prisma.question.findMany({
      where: { testId },
      orderBy: { sortIndex: 'asc' },
      include: { answers: { orderBy: { sortIndex: 'asc' } } },
    });
    return questions;
  }



  async submitAttempt(attemptId: string, answers: { questionId: string; answerIds: string[] }[]) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    // Проверяем статус пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: attempt.userId },
      select: { status: true }
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'APPROVED') {
      throw new ForbiddenException({ 
        code: 'USER_NOT_APPROVED', 
        message: 'Ваша учетная запись не подтверждена администратором.' 
      });
    }

    const questions = await this.prisma.question.findMany({
      where: { testId: attempt.testId },
      include: { answers: true },
    });

    let earnedPoints = 0;
    let totalPoints = 0;
    const feedback: { questionId: string; earnedPoints: number; totalPoints: number; isCorrect: boolean; correctAnswers: string[]; chosenAnswers: string[]; isPartial: boolean }[] = [];

    for (const q of questions) {
      const questionPoints = q.points || 1;
      totalPoints += questionPoints;
      const userAnswer = answers.find((a) => a.questionId === q.id);
      const correctSet = new Set<string>(q.answers.filter((a) => a.isCorrect).map((a) => a.id));
      const chosenSet = new Set<string>(userAnswer?.answerIds ?? []);

      let questionEarned = 0;
      let isCorrect = false;
      let isPartial = false;

      if (q.type === 'MULTI') {
        const hasWrongSelected = [...chosenSet].some((id) => !correctSet.has(id));
        const correctChosenCount = [...chosenSet].filter((id) => correctSet.has(id)).length;
        const fullMatch = correctSet.size === chosenSet.size && correctSet.size > 0 && !hasWrongSelected;
        if (fullMatch) {
          questionEarned = questionPoints;
          isCorrect = true;
        } else {
          const correctCount = correctSet.size;
          isPartial = !hasWrongSelected && correctChosenCount > 0 && correctChosenCount < correctCount && (correctCount === 2 || correctCount === 3);
          if (isPartial) {
            questionEarned = questionPoints / 2;
          }
        }
      } else {
        isCorrect = correctSet.size === chosenSet.size && [...correctSet].every((id) => chosenSet.has(id));
        if (isCorrect) questionEarned = questionPoints;
      }

      earnedPoints += questionEarned;

      feedback.push({
        questionId: q.id,
        earnedPoints: questionEarned,
        totalPoints: questionPoints,
        isCorrect,
        correctAnswers: [...correctSet].sort(),
        chosenAnswers: [...chosenSet].sort(),
        isPartial,
      });
    }

    const score = Math.round(((earnedPoints || 0) / (totalPoints || 1)) * 100);
    const testFull = await this.prisma.test.findUnique({
      where: { id: attempt.testId },
      select: {
        passScore: true,
        chapter: { select: { id: true, passScore: true, orderIndex: true } },
        lesson: { select: { id: true, chapterId: true, chapter: { select: { id: true, passScore: true } } } },
      },
    });
    // Правило: приоритет passScore у самого теста; если не задан и тест у урока — берём passScore главы урока; если тест у главы — берём passScore главы
    const passScore =
      (testFull?.passScore ?? null) ??
      (testFull?.chapter?.passScore ?? null) ??
      (testFull?.lesson?.chapter?.passScore ?? 0);
    const status = score >= passScore ? 'PASSED' : 'FAILED';
    await this.prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { finishedAt: new Date(), score, status },
    });

    // Обновление прогресса: если тест у урока — отмечаем урок как завершён (на случай без видео);
    // если тест у главы — отмечаем главу COMPLETED
    if (status === 'PASSED' && testFull) {
      if (testFull.lesson) {
        await this.prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: attempt.userId, lessonId: testFull.lesson.id } },
          update: { completed: true, completedAt: new Date() },
          create: { userId: attempt.userId, lessonId: testFull.lesson.id, videoProgress: {}, completed: true, completedAt: new Date() },
        });
      } else if (testFull.chapter) {
        await this.prisma.userProgress.upsert({
          where: { userId_chapterId: { userId: attempt.userId, chapterId: testFull.chapter.id } },
          update: { status: 'COMPLETED', bestScore: { set: score } },
          create: { userId: attempt.userId, chapterId: testFull.chapter.id, status: 'COMPLETED', bestScore: score },
        });
      }
    }

    return { score, status, feedback, totalPoints, earnedPoints };
  }
}


