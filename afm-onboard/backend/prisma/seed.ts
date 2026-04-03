import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const pwd = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin#2025';
  const hash = await bcrypt.hash(pwd, 12);

  // 1) Ensure Super Admin exists
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, role: 'ADMIN', status: 'APPROVED' },
    create: {
      fullName: 'Super Admin',
      position: 'Administrator',
      birthDate: new Date('1990-01-01'),
      email: adminEmail,
      passwordHash: hash,
      role: 'ADMIN',
      status: 'APPROVED',
    },
  });

  // 2) Create a comprehensive base course
  const BASE_COURSE_ID = '11111111-1111-1111-1111-111111111111';
  const baseCourse = await prisma.course.upsert({
    where: { id: BASE_COURSE_ID },
    update: {
      title: 'Базовый курс АФМ',
      description:
        'Комплексное введение в финансовый мониторинг: правовая база, KYC/AML, риск-ориентированный подход, мониторинг транзакций, признаки подозрительных операций и международные стандарты.',
      isPublished: true,
      updatedById: admin.id,
      isPublic: false,
      version: 1,
      seriesId: BASE_COURSE_ID,
    },
    create: {
      id: BASE_COURSE_ID,
      title: 'Базовый курс АФМ',
      description:
        'Комплексное введение в финансовый мониторинг: правовая база, KYC/AML, риск-ориентированный подход, мониторинг транзакций, признаки подозрительных операций и международные стандарты.',
      isPublished: true,
      createdById: admin.id,
      updatedById: admin.id,
      isPublic: false,
      version: 1,
      seriesId: BASE_COURSE_ID,
    },
  });

  // Access for admin to the course (employees выдаются через админ‑панель)
  await prisma.userCourseAccess.upsert({
    where: { userId_courseId: { userId: admin.id, courseId: baseCourse.id } },
    update: {},
    create: { userId: admin.id, courseId: baseCourse.id },
  });

  // 3) Define modules (chapters)
  const chapterDefs: { title: string; description: string; passScore: number }[] = [
    { title: 'Введение в АФМ', description: 'Цели, задачи, терминология и роль финансового мониторинга в ПОД/ФТ.', passScore: 70 },
    { title: 'Правовая база и нормативы', description: 'Ключевые законы РК, подзаконные акты, требования надзорных органов.', passScore: 70 },
    { title: 'KYC и идентификация клиентов', description: 'Процедуры идентификации и верификации, источники и уровни надёжности.', passScore: 75 },
    { title: 'Риск-ориентированный подход (РОП)', description: 'Классификация рисков, факторы, матрицы и стратегии снижения.', passScore: 75 },
    { title: 'Мониторинг транзакций', description: 'Методы, правила, сценарии и пороговые операции.', passScore: 75 },
    { title: 'Признаки подозрительных операций', description: 'Триггеры, индикаторы, поведенческие модели и красные флаги.', passScore: 80 },
    { title: 'Сообщения и взаимодействие', description: 'Порядок подготовки и отправки сообщений, взаимодействие с регулятором.', passScore: 75 },
    { title: 'Документирование и отчётность', description: 'Требования к учёту, хранению, отчётности и внутреннему контролю.', passScore: 75 },
    { title: 'Взаимодействие с банками и НФО', description: 'Практика обмена данными, запросы и ответы, координация действий.', passScore: 75 },
    { title: 'Международные стандарты FATF', description: 'Рекомендации FATF, взаимные оценки и наилучшие практики.', passScore: 80 },
    { title: 'Информационная безопасность', description: 'Конфиденциальность ПДн, безопасная обработка и хранение данных.', passScore: 70 },
    { title: 'Итоги и практические кейсы', description: 'Систематизация знаний, разбор реальных кейсов и тестирование.', passScore: 80 },
  ];

  // Utility: ensure chapter intro content
  async function upsertChapterWithIntro(orderIndex: number, def: (typeof chapterDefs)[number]) {
    const ch = await prisma.chapter.upsert({
      where: { courseId_orderIndex: { courseId: baseCourse.id, orderIndex } },
      update: {
        title: def.title,
        description: def.description,
        passScore: def.passScore,
        isPublished: true,
        updatedById: admin.id,
      },
      create: {
        courseId: baseCourse.id,
        orderIndex,
        title: def.title,
        description: def.description,
        passScore: def.passScore,
        isPublished: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });

    // Chapter intro content (idempotent: replace blocks)
    await prisma.chapterContent.deleteMany({ where: { chapterId: ch.id } });
    await prisma.chapterContent.createMany({
      data: [
        {
          chapterId: ch.id,
          blockType: 'TEXT',
          textHtml: `<h2>${def.title}</h2><p>${def.description}</p><ul><li>Цели модуля</li><li>Ожидаемые результаты</li><li>Ключевые термины</li></ul>`,
          sortIndex: 1,
        } as any,
        {
          chapterId: ch.id,
          blockType: 'VIDEO',
          mediaKey: '/uploads/training-video.mp4',
          sortIndex: 2,
        } as any,
      ],
    });

    return ch;
  }

  // Utility: seed lessons with rich content
  async function seedLessons(chapterId: string, count = 7) {
    for (let i = 1; i <= count; i++) {
      const title = `Урок ${i}. Тема и практика`;
      const description = `Подробное изложение темы урока ${i}: определения, примеры, типовые ошибки, контрольные вопросы.`;
      const lesson = await prisma.lesson.upsert({
        where: { chapterId_orderIndex: { chapterId, orderIndex: i } },
        update: { title, description },
        create: { chapterId, orderIndex: i, title, description },
      });
      await prisma.lessonContent.deleteMany({ where: { lessonId: lesson.id } });
      await prisma.lessonContent.createMany({
        data: [
          {
            lessonId: lesson.id,
            blockType: 'TEXT',
            textHtml:
              `<h3>Теория</h3><p>В данном уроке рассматриваются ключевые понятия, нормативные требования и типовые сценарии применения. Приводятся примеры и рекомендации.</p>`,
            sortIndex: 1,
          } as any,
          { lessonId: lesson.id, blockType: 'VIDEO', mediaKey: '/uploads/training-video.mp4', sortIndex: 2 } as any,
          {
            lessonId: lesson.id,
            blockType: 'TEXT',
            textHtml:
              `<h3>Практика</h3><p>Выполните мини-кейс: определите риски, предложите меры и кратко обоснуйте решение. Сравните с эталонным ответом.</p>`,
            sortIndex: 3,
          } as any,
        ],
      });
    }
  }

  // Utility: (re)create chapter test with questions
  async function seedChapterTest(chapterId: string, passScore: number) {
    const test = await prisma.test.upsert({
      where: { chapterId },
      update: { timeLimitSec: 900, shuffleAnswers: true, shuffleQuestions: true, isPublished: true, passScore: null },
      create: { chapterId, timeLimitSec: 900, shuffleAnswers: true, shuffleQuestions: true, isPublished: true, passScore: null },
    });
    // Clean existing Q/A
    await prisma.answer.deleteMany({ where: { question: { testId: test.id } } });
    await prisma.question.deleteMany({ where: { testId: test.id } });

    // 8 mixed questions
    const questions: Array<{
      type: 'SINGLE' | 'MULTI' | 'BOOLEAN';
      text: string;
      answers?: { text: string; isCorrect: boolean }[];
      booleanCorrect?: boolean;
    }> = [
      {
        type: 'SINGLE',
        text: 'Что является основной целью финансового мониторинга?',
        answers: [
          { text: 'Противодействие отмыванию доходов и финансированию терроризма', isCorrect: true },
          { text: 'Усложнение процедур для клиентов', isCorrect: false },
          { text: 'Снижение налоговой нагрузки', isCorrect: false },
        ],
      },
      {
        type: 'MULTI',
        text: 'Выберите корректные элементы KYC:',
        answers: [
          { text: 'Идентификация клиента', isCorrect: true },
          { text: 'Верификация документов', isCorrect: true },
          { text: 'Игнорирование источника средств', isCorrect: false },
          { text: 'Определение выгодоприобретателя', isCorrect: true },
        ],
      },
      { type: 'BOOLEAN', text: 'РОП предполагает одинаковые меры для всех клиентов.', booleanCorrect: false },
      {
        type: 'SINGLE',
        text: 'Что из ниже перечисленного является индикатором подозрительной операции?',
        answers: [
          { text: 'Необычная структура транзакций без явной деловой цели', isCorrect: true },
          { text: 'Оплата коммунальных услуг', isCorrect: false },
          { text: 'Регулярная зарплатная выплата', isCorrect: false },
        ],
      },
      {
        type: 'MULTI',
        text: 'Какие меры относятся к снижению риска?',
        answers: [
          { text: 'Усиленная проверка клиента', isCorrect: true },
          { text: 'Мониторинг транзакций', isCorrect: true },
          { text: 'Отсутствие документирования', isCorrect: false },
          { text: 'Обучение сотрудников', isCorrect: true },
        ],
      },
      { type: 'BOOLEAN', text: 'Рекомендации FATF обязательны к исполнению во всех странах без исключения.', booleanCorrect: false },
      {
        type: 'SINGLE',
        text: 'Какой минимальный результат считается прохождением главы?',
        answers: [
          { text: 'Зависит от установленного pass_score главы', isCorrect: true },
          { text: 'Всегда 100%', isCorrect: false },
          { text: 'Всегда 50%', isCorrect: false },
        ],
      },
      {
        type: 'SINGLE',
        text: 'Что необходимо сделать перед отправкой сообщения регулятору?',
        answers: [
          { text: 'Проверить полноту и корректность данных, зафиксировать основания', isCorrect: true },
          { text: 'Отправить без проверки, чтобы уложиться в срок', isCorrect: false },
          { text: 'Отложить до окончания квартала', isCorrect: false },
        ],
      },
    ];

    // Create questions with answers
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      if (q.type === 'BOOLEAN') {
        await prisma.question.create({
          data: {
            testId: test.id,
            type: 'BOOLEAN' as any,
            text: q.text,
            sortIndex: idx + 1,
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
      } else {
        await prisma.question.create({
          data: {
            testId: test.id,
            type: q.type as any,
            text: q.text,
            sortIndex: idx + 1,
            answers: { createMany: { data: (q.answers || []).map((a, j) => ({ text: a.text, isCorrect: a.isCorrect, sortIndex: j + 1 })) } },
          },
        });
      }
    }
  }

  // 4) Seed all chapters, lessons and tests
  const createdChapters: string[] = [];
  for (let i = 0; i < chapterDefs.length; i++) {
    const ch = await upsertChapterWithIntro(i + 1, chapterDefs[i]);
    createdChapters.push(ch.id);
    await seedLessons(ch.id, 7);
    await seedChapterTest(ch.id, chapterDefs[i].passScore);
  }

  await prisma.$disconnect();
  console.log('Seed done. Admin:', adminEmail, '| Course:', baseCourse.title, '| Chapters:', createdChapters.length);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});


