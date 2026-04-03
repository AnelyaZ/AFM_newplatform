import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courseId = process.argv[2];
  if (!courseId) {
    console.error('Usage: ts-node scripts/seedCourseAndModuleTests.ts <courseId>');
    process.exit(1);
  }

  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { chapters: { orderBy: { orderIndex: 'asc' } } } });
  if (!course) {
    console.error('Course not found:', courseId);
    process.exit(2);
  }

  // Upsert course-level test
  const courseTest = await prisma.test.upsert({
    where: { courseId },
    update: { passScore: 70, timeLimitSec: 900, attemptLimit: 3, shuffleQuestions: true, shuffleAnswers: true, isPublished: true },
    create: { courseId, passScore: 70, timeLimitSec: 900, attemptLimit: 3, shuffleQuestions: true, shuffleAnswers: true, isPublished: true },
    select: { id: true },
  });

  // Replace existing course questions
  const existingCourseQs = await prisma.question.findMany({ where: { testId: courseTest.id }, select: { id: true } });
  if (existingCourseQs.length) {
    await prisma.answer.deleteMany({ where: { question: { testId: courseTest.id } } });
    await prisma.question.deleteMany({ where: { testId: courseTest.id } });
  }

  const makeSingle = (text: string, opts: string[], correctIndex: number) => ({
    type: 'SINGLE' as QuestionType,
    text,
    answers: opts.map((t, i) => ({ text: t, isCorrect: i === correctIndex })),
  });
  const makeMulti = (text: string, opts: string[], correct: number[]) => ({
    type: 'MULTI' as QuestionType,
    text,
    answers: opts.map((t, i) => ({ text: t, isCorrect: correct.includes(i) })),
  });

  const courseQuestions = [
    makeSingle('Основная цель финансового мониторинга — это…', [
      'повышение прибыли банков',
      'выявление и предотвращение отмывания доходов и финансирования терроризма',
      'налогообложение физических лиц',
      'управление валютным курсом',
    ], 1),
    makeMulti('Выберите признаки, которые могут указывать на подозрительную операцию:', [
      'частые дробные переводы без экономического смысла',
      'операции с взаимосвязанными лицами при отсутствии документального обоснования',
      'стабильные регулярные зарплатные выплаты',
      'крупные наличные снятия без явной цели',
    ], [0, 1, 3]),
    makeSingle('KYC означает…', [
      'Know Your Client',
      'Keep Your Cash',
      'Know Your Company',
      'Keep Your Compliance',
    ], 0),
    makeMulti('К базовым мерам комплаенса относятся:', [
      'идентификация клиента',
      'верификация бенефициара',
      'оптимизация налогов клиента',
      'мониторинг операций',
    ], [0, 1, 3]),
  ];

  for (let i = 0; i < courseQuestions.length; i += 1) {
    const q = courseQuestions[i];
    const created = await prisma.question.create({
      data: {
        testId: courseTest.id,
        type: q.type,
        text: q.text,
        sortIndex: i + 1,
        points: 1,
      },
      select: { id: true },
    });
    await prisma.answer.createMany({
      data: q.answers.map((a, j) => ({ questionId: created.id, text: a.text, isCorrect: a.isCorrect, sortIndex: j + 1 })),
    });
  }

  // Upsert chapter tests (first up to 3 chapters)
  for (const ch of course.chapters.slice(0, 3)) {
    const chapterTest = await prisma.test.upsert({
      where: { chapterId: ch.id },
      update: { timeLimitSec: 600, attemptLimit: 5, shuffleQuestions: true, shuffleAnswers: true, isPublished: true },
      create: { chapterId: ch.id, timeLimitSec: 600, attemptLimit: 5, shuffleQuestions: true, shuffleAnswers: true, isPublished: true },
      select: { id: true },
    });
    const existingQs = await prisma.question.findMany({ where: { testId: chapterTest.id }, select: { id: true } });
    if (existingQs.length) {
      await prisma.answer.deleteMany({ where: { question: { testId: chapterTest.id } } });
      await prisma.question.deleteMany({ where: { testId: chapterTest.id } });
    }
    const qs = [
      makeSingle(`Модуль «${ch.title}»: выберите верный тезис`, [
        'Риск-профиль клиента не меняется со временем',
        'Риск-профиль клиента может меняться и требует периодического пересмотра',
        'Риск-профиль зависит только от доходов клиента',
        'Риск-профиль формируется исключительно на основании гражданства',
      ], 1),
      makeMulti('Какие действия относятся к усиленным мерам должной осмотрительности (EDD)?', [
        'упрощённая регистрация без документов',
        'углублённая проверка источника средств',
        'согласование операций с ответственным сотрудником',
        'исключение клиента из мониторинга',
      ], [1, 2]),
      makeSingle('Триггером для дополнительной проверки чаще всего является…', [
        'регулярная зарплатная операция',
        'крупная разовая наличная операция без объяснения',
        'оплата коммунальных услуг',
        'покупка продуктов питания',
      ], 1),
    ];
    for (let i = 0; i < qs.length; i += 1) {
      const q = qs[i];
      const created = await prisma.question.create({
        data: { testId: chapterTest.id, type: q.type, text: q.text, sortIndex: i + 1, points: 1 },
        select: { id: true },
      });
      await prisma.answer.createMany({ data: q.answers.map((a, j) => ({ questionId: created.id, text: a.text, isCorrect: a.isCorrect, sortIndex: j + 1 })) });
    }
  }

  console.log('Seeded course test and chapter tests for course', courseId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


