import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE_COURSE_ID = '11111111-1111-1111-1111-111111111111';

const PDF_MODULES = [
  {
    title: 'Нормативно-правовые документы',
    description: 'Нормативные постановления Верховного Суда РК по вопросам экономических правонарушений, сделок, налогообложения и банкротства.',
    folder: 'norms',
    passScore: 70,
    lessons: [
      { file: 'norm1.37a9a366.pdf', title: 'О недействительности сделок и применении судами последствий' },
      { file: 'norm2.d3ecd7f3.pdf', title: 'О применении судами законодательства по уголовным правонарушениям в сфере экономики' },
      { file: 'norm3.a0a3cc7a.pdf', title: 'О рассмотрении гражданского иска в уголовном процессе' },
      { file: 'norm4.6ab03320.pdf', title: 'О судебной практике применения налогового законодательства' },
      { file: 'norm5.d09ece07.pdf', title: 'О практике применения законодательства о реабилитации и банкротстве' },
    ],
  },
  {
    title: 'Методики расследования (часть 1)',
    description: 'Методические рекомендации по расследованию экономических преступлений: статьи УК РК, приёмы и алгоритмы работы.',
    folder: 'methods',
    passScore: 70,
    lessons: [
      { file: 'met1.b86333e7.pdf', title: 'Методика расследования — базовый документ' },
      { file: 'met2.93348a19.pdf', title: 'Методика расследования (документ 2)' },
      { file: 'met3.0aa8b1c2.pdf', title: 'Методика расследования (документ 3)' },
      { file: 'met4.ec748601.pdf', title: 'Методика расследования (документ 4)' },
      { file: 'met5.9fb48ce4.pdf', title: 'Методика расследования (документ 5)' },
      { file: 'met6.0e245b18.pdf', title: 'Методика расследования (документ 6)' },
      { file: 'met7.95428149.pdf', title: 'Методика расследования (документ 7)' },
      { file: 'met11.c9f5f135.pdf', title: 'Методика расследования (документ 11)' },
      { file: 'met22rus.7f0129a6.pdf', title: 'Методика — статья 22 (рус)' },
      { file: 'met22kaz.2af5029f.pdf', title: 'Методика — статья 22 (каз)' },
      { file: 'met189_190_1rus.ba596979.pdf', title: 'Методика — статьи 189-190 (рус)' },
      { file: 'met189_190_1kaz.2550d228.pdf', title: 'Методика — статьи 189-190 (каз)' },
      { file: 'met_eag_podft.74df9f41.pdf', title: 'Методика ЕАГ по ПОД/ФТ' },
      { file: 'MetPfr.fe3b897f.pdf', title: 'Методика ПФР (рус)' },
      { file: 'MetPfrKaz.d9c068d4.pdf', title: 'Методика ПФР (каз)' },
      { file: 'meta2.d0c0e783.pdf', title: 'Дополнительная методика' },
    ],
  },
  {
    title: 'Методики расследования (часть 2)',
    description: 'Методические рекомендации по отдельным статьям УК: ст. 214, 216, 217, 231, 234-236, 286, 307.',
    folder: 'methods',
    passScore: 70,
    lessons: [
      { file: 'met214rus.2a0600e5.pdf', title: 'Методика — статья 214 (рус)' },
      { file: 'met214kaz.b7e5eee9.pdf', title: 'Методика — статья 214 (каз)' },
      { file: 'met214pril1rus.2c8a722c.pdf', title: 'Приложение 1 к ст. 214 (рус)' },
      { file: 'met214pril1kaz.0352c3dc.pdf', title: 'Приложение 1 к ст. 214 (каз)' },
      { file: 'met214pril2rus.10dacb21.pdf', title: 'Приложение 2 к ст. 214 (рус)' },
      { file: 'met214pril2kaz.07ab80a2.pdf', title: 'Приложение 2 к ст. 214 (каз)' },
      { file: 'met216_methodology.1904e9cf.pdf', title: 'Методика — статья 216' },
      { file: 'met217rus.b7f17863.pdf', title: 'Методика — статья 217 (рус)' },
      { file: 'met217Kaz.4d9502c1.pdf', title: 'Методика — статья 217 (каз)' },
      { file: 'met231rus.fc9a1ff9.pdf', title: 'Методика — статья 231 (рус)' },
      { file: 'met231kaz.40af1cdc.pdf', title: 'Методика — статья 231 (каз)' },
      { file: 'met234_236rus.aa2adecf.pdf', title: 'Методика — статьи 234-236 (рус)' },
      { file: 'met234_236kaz.3a0bbd99.pdf', title: 'Методика — статьи 234-236 (каз)' },
      { file: 'met286rus.a175cc5a.pdf', title: 'Методика — статья 286 (рус)' },
      { file: 'met286kaz.27bd4244.pdf', title: 'Методика — статья 286 (каз)' },
      { file: 'met307.886bae32.pdf', title: 'Методика — статья 307' },
    ],
  },
  {
    title: 'Образцы уголовно-процессуальных документов',
    description: 'Типовые образцы процессуальных документов для следственных действий: постановления, протоколы, рапорты.',
    folder: 'samples',
    passScore: 70,
    lessons: [
      { file: 'obrPros.416f58bf.pdf', title: 'Общий сборник образцов процессуальных документов' },
      { file: 'obrpros1.c48248c4.pdf', title: 'Образец процессуального документа №1' },
      { file: 'obrpros2.5c112111.pdf', title: 'Образец процессуального документа №2' },
      { file: 'obrpros3.605938f0.pdf', title: 'Образец процессуального документа №3' },
      { file: 'obrpros4.aeb1a42f.pdf', title: 'Образец процессуального документа №4' },
      { file: 'obrpros5.cec5edcd.pdf', title: 'Образец процессуального документа №5' },
      { file: 'obrpros6.3c9dc2d2.pdf', title: 'Образец процессуального документа №6' },
      { file: 'obrpros7.f44fbb68.pdf', title: 'Образец процессуального документа №7' },
      { file: 'obrpros8.f387cb15.pdf', title: 'Образец процессуального документа №8' },
      { file: 'obrpros9.09c58ae9.pdf', title: 'Образец процессуального документа №9' },
      { file: 'obrpros10.bc1ae081.pdf', title: 'Образец процессуального документа №10' },
      { file: 'obrpros11.61d51380.pdf', title: 'Образец процессуального документа №11' },
      { file: 'obrpros12.b0b8a5b9.pdf', title: 'Образец процессуального документа №12' },
      { file: 'obrpros13.75ac401c.pdf', title: 'Образец процессуального документа №13' },
      { file: 'obrpros14.9773fe0b.pdf', title: 'Образец процессуального документа №14' },
      { file: 'obrpros15.0c6c17d1.pdf', title: 'Образец процессуального документа №15' },
      { file: 'obrpros16.24d01967.pdf', title: 'Образец процессуального документа №16' },
      { file: 'obrpros17.c51fac23.pdf', title: 'Образец процессуального документа №17' },
      { file: 'obrpros18.40f261f7.pdf', title: 'Образец процессуального документа №18' },
      { file: 'obrpros19.8369d920.pdf', title: 'Образец процессуального документа №19' },
    ],
  },
  {
    title: 'Алгоритмы расследования',
    description: 'Алгоритмы и блок-схемы расследования по различным категориям дел: общие, игорный бизнес, особый порядок.',
    folder: 'algorithms',
    passScore: 70,
    lessons: [
      { file: 'algobsh.89e4cd41.pdf', title: 'Общий алгоритм расследования' },
      { file: 'algoigroRus.b5bc6097.pdf', title: 'Алгоритм расследования — игорный бизнес (рус)' },
      { file: 'algoigroKaz.a1d639ba.pdf', title: 'Алгоритм расследования — игорный бизнес (каз)' },
      { file: 'algg.9711d002.pdf', title: 'Алгоритм — общая схема' },
      { file: 'alg307.adb14850.pdf', title: 'Алгоритм расследования — статья 307' },
      { file: 'alcasi.ebbb863e.pdf', title: 'Алгоритм — особый порядок' },
    ],
  },
  {
    title: 'Приложения и справочные материалы',
    description: 'Дополнительные приложения к методикам, правила доступа и справочные документы.',
    folder: 'other',
    passScore: 70,
    lessons: [
      { file: 'pril286rus.7c928439.pdf', title: 'Приложение к ст. 286 (рус)' },
      { file: 'pril286kaz.dcb9e052.pdf', title: 'Приложение к ст. 286 (каз)' },
      { file: 'diff.63987624.pdf', title: 'Сравнительный анализ' },
      { file: 'soglasie-na-ispolzovaniya-is.6fe9a1cb.pdf', title: 'Согласие на использование ИС' },
      { file: 'pravila-dostupa.c59d0e9b.pdf', title: 'Правила доступа к платформе' },
    ],
  },
];

const TEST_QUESTIONS: Array<{
  type: 'SINGLE' | 'MULTI' | 'BOOLEAN';
  text: string;
  answers?: { text: string; isCorrect: boolean }[];
  booleanCorrect?: boolean;
}> = [
  { type: 'SINGLE', text: 'Что является основной целью финансового мониторинга?', answers: [
    { text: 'Противодействие отмыванию доходов и финансированию терроризма', isCorrect: true },
    { text: 'Усложнение процедур для клиентов', isCorrect: false },
    { text: 'Снижение налоговой нагрузки', isCorrect: false },
  ]},
  { type: 'MULTI', text: 'Выберите корректные элементы KYC:', answers: [
    { text: 'Идентификация клиента', isCorrect: true },
    { text: 'Верификация документов', isCorrect: true },
    { text: 'Игнорирование источника средств', isCorrect: false },
    { text: 'Определение выгодоприобретателя', isCorrect: true },
  ]},
  { type: 'BOOLEAN', text: 'РОП предполагает одинаковые меры для всех клиентов.', booleanCorrect: false },
  { type: 'SINGLE', text: 'Что из ниже перечисленного является индикатором подозрительной операции?', answers: [
    { text: 'Необычная структура транзакций без явной деловой цели', isCorrect: true },
    { text: 'Оплата коммунальных услуг', isCorrect: false },
    { text: 'Регулярная зарплатная выплата', isCorrect: false },
  ]},
  { type: 'MULTI', text: 'Какие меры относятся к снижению риска?', answers: [
    { text: 'Усиленная проверка клиента', isCorrect: true },
    { text: 'Мониторинг транзакций', isCorrect: true },
    { text: 'Отсутствие документирования', isCorrect: false },
    { text: 'Обучение сотрудников', isCorrect: true },
  ]},
  { type: 'BOOLEAN', text: 'Рекомендации FATF обязательны к исполнению во всех странах без исключения.', booleanCorrect: false },
  { type: 'SINGLE', text: 'Какой минимальный результат считается прохождением главы?', answers: [
    { text: 'Зависит от установленного pass_score главы', isCorrect: true },
    { text: 'Всегда 100%', isCorrect: false },
    { text: 'Всегда 50%', isCorrect: false },
  ]},
  { type: 'SINGLE', text: 'Что необходимо сделать перед отправкой сообщения регулятору?', answers: [
    { text: 'Проверить полноту и корректность данных, зафиксировать основания', isCorrect: true },
    { text: 'Отправить без проверки, чтобы уложиться в срок', isCorrect: false },
    { text: 'Отложить до окончания квартала', isCorrect: false },
  ]},
];

const THEORY_CHAPTERS = [
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

// Видео привязаны к номеру модуля (chapter orderIndex), ставятся на 1-й урок модуля
const MODULE_VIDEOS: Record<number, string> = {
  5: '1756375148334-cpyfm04y5s5.mp4',
  6: '1756375271239-0ne7ij7l0yy.mp4',
  14: '1756375726103-s46vgy8cbu.mp4',
  15: '1756375773068-lsj43reefdq.mp4',
};

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const pwd = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin#2025';
  const hash = await bcrypt.hash(pwd, 12);

  console.log('1/6 Админ...');
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, role: 'ADMIN', status: 'APPROVED' },
    create: { fullName: 'Super Admin', position: 'Administrator', birthDate: new Date('1990-01-01'), email: adminEmail, passwordHash: hash, role: 'ADMIN', status: 'APPROVED' },
  });

  console.log('2/6 Курс...');
  const course = await prisma.course.upsert({
    where: { id: BASE_COURSE_ID },
    update: { title: 'Базовый курс АФМ', description: 'Комплексное введение в финансовый мониторинг: правовая база, KYC/AML, риск-ориентированный подход, мониторинг транзакций, признаки подозрительных операций и международные стандарты.', isPublished: true, updatedById: admin.id, isPublic: false, version: 1, seriesId: BASE_COURSE_ID },
    create: { id: BASE_COURSE_ID, title: 'Базовый курс АФМ', description: 'Комплексное введение в финансовый мониторинг: правовая база, KYC/AML, риск-ориентированный подход, мониторинг транзакций, признаки подозрительных операций и международные стандарты.', isPublished: true, createdById: admin.id, updatedById: admin.id, isPublic: false, version: 1, seriesId: BASE_COURSE_ID },
  });

  await prisma.userCourseAccess.upsert({
    where: { userId_courseId: { userId: admin.id, courseId: course.id } },
    update: {},
    create: { userId: admin.id, courseId: course.id },
  });

  console.log('3/6 Теоретические модули...');
  for (let i = 0; i < THEORY_CHAPTERS.length; i++) {
    const def = THEORY_CHAPTERS[i];
    const moduleIndex = i + 1; // orderIndex модуля (1-based)
    const ch = await prisma.chapter.upsert({
      where: { courseId_orderIndex: { courseId: course.id, orderIndex: moduleIndex } },
      update: { title: def.title, description: def.description, passScore: def.passScore, isPublished: true, updatedById: admin.id },
      create: { courseId: course.id, orderIndex: moduleIndex, title: def.title, description: def.description, passScore: def.passScore, isPublished: true, createdById: admin.id, updatedById: admin.id },
    });

    await prisma.chapterContent.deleteMany({ where: { chapterId: ch.id } });
    await prisma.chapterContent.create({
      data: { chapterId: ch.id, blockType: 'TEXT', textHtml: `<h2>${def.title}</h2><p>${def.description}</p><ul><li>Цели модуля</li><li>Ожидаемые результаты</li><li>Ключевые термины</li></ul>`, sortIndex: 1 },
    });

    for (let j = 1; j <= 7; j++) {
      const lesson = await prisma.lesson.upsert({
        where: { chapterId_orderIndex: { chapterId: ch.id, orderIndex: j } },
        update: { title: `Урок ${j}. Тема и практика`, description: `Подробное изложение темы урока ${j}.` },
        create: { chapterId: ch.id, orderIndex: j, title: `Урок ${j}. Тема и практика`, description: `Подробное изложение темы урока ${j}.` },
      });
      await prisma.lessonContent.deleteMany({ where: { lessonId: lesson.id } });

      const videoFile = j === 1 ? MODULE_VIDEOS[moduleIndex] : undefined;
      const blocks: any[] = [
        { lessonId: lesson.id, blockType: 'TEXT', textHtml: `<h3>Теория</h3><p>Ключевые понятия, нормативные требования и типовые сценарии.</p>`, sortIndex: 1 },
      ];
      if (videoFile) {
        blocks.push({ lessonId: lesson.id, blockType: 'VIDEO', mediaKey: `/uploads/${videoFile}`, sortIndex: 2 });
      }
      blocks.push({ lessonId: lesson.id, blockType: 'TEXT', textHtml: `<h3>Практика</h3><p>Мини-кейс: определите риски, предложите меры и обоснуйте решение.</p>`, sortIndex: videoFile ? 3 : 2 });
      await prisma.lessonContent.createMany({ data: blocks });
    }

    const test = await prisma.test.upsert({
      where: { chapterId: ch.id },
      update: { timeLimitSec: 900, shuffleAnswers: true, shuffleQuestions: true, isPublished: true, passScore: null },
      create: { chapterId: ch.id, timeLimitSec: 900, shuffleAnswers: true, shuffleQuestions: true, isPublished: true, passScore: null },
    });
    await prisma.answer.deleteMany({ where: { question: { testId: test.id } } });
    await prisma.question.deleteMany({ where: { testId: test.id } });
    for (let idx = 0; idx < TEST_QUESTIONS.length; idx++) {
      const q = TEST_QUESTIONS[idx];
      if (q.type === 'BOOLEAN') {
        await prisma.question.create({
          data: { testId: test.id, type: 'BOOLEAN' as any, text: q.text, sortIndex: idx + 1, answers: { createMany: { data: [{ text: 'Правда', isCorrect: q.booleanCorrect === true, sortIndex: 1 }, { text: 'Ложь', isCorrect: q.booleanCorrect === false, sortIndex: 2 }] } } },
        });
      } else {
        await prisma.question.create({
          data: { testId: test.id, type: q.type as any, text: q.text, sortIndex: idx + 1, answers: { createMany: { data: (q.answers || []).map((a, j) => ({ text: a.text, isCorrect: a.isCorrect, sortIndex: j + 1 })) } } },
        });
      }
    }
  }

  console.log('4/6 PDF модули...');
  let nextOrder = THEORY_CHAPTERS.length + 1;
  let totalPdfLessons = 0;

  for (const mod of PDF_MODULES) {
    const existing = await prisma.chapter.findFirst({ where: { courseId: course.id, title: mod.title } });
    const chapterOrder = existing ? existing.orderIndex : nextOrder;
    const chapter = existing || await prisma.chapter.create({
      data: { courseId: course.id, orderIndex: nextOrder++, title: mod.title, description: mod.description, passScore: mod.passScore, isPublished: true, createdById: admin.id, updatedById: admin.id },
    });
    if (!existing) {
      await prisma.chapterContent.create({
        data: { chapterId: chapter.id, blockType: 'TEXT', textHtml: `<h2>${mod.title}</h2><p>${mod.description}</p><p>Документов: ${mod.lessons.length}</p>`, sortIndex: 1 },
      });
    }

    const existingLessons = await prisma.lesson.count({ where: { chapterId: chapter.id } });
    if (existingLessons > 0) {
      totalPdfLessons += existingLessons;
      // Добавляем видео на 1-й урок если модуль входит в MODULE_VIDEOS
      const videoFile = MODULE_VIDEOS[chapterOrder];
      if (videoFile) {
        const firstLesson = await prisma.lesson.findFirst({ where: { chapterId: chapter.id, orderIndex: 1 } });
        if (firstLesson) {
          const hasVideo = await prisma.lessonContent.findFirst({ where: { lessonId: firstLesson.id, blockType: 'VIDEO' } });
          if (!hasVideo) {
            // Сдвигаем sortIndex существующих блоков вниз и вставляем видео на позицию 2
            await prisma.$executeRawUnsafe(
              `UPDATE "LessonContent" SET "sortIndex" = "sortIndex" + 1 WHERE "lessonId" = $1::uuid AND "sortIndex" >= 2`,
              firstLesson.id,
            );
            await prisma.lessonContent.create({
              data: { lessonId: firstLesson.id, blockType: 'VIDEO', mediaKey: `/uploads/${videoFile}`, sortIndex: 2 },
            });
          }
        }
      }
      continue;
    }

    for (let i = 0; i < mod.lessons.length; i++) {
      const lessonDef = mod.lessons[i];
      const lesson = await prisma.lesson.create({
        data: { chapterId: chapter.id, orderIndex: i + 1, title: lessonDef.title, description: `PDF: ${lessonDef.file}` },
      });
      const videoFile = i === 0 ? MODULE_VIDEOS[chapterOrder] : undefined;
      const contentBlocks: any[] = [
        { lessonId: lesson.id, blockType: 'TEXT' as any, textHtml: `<h3>${lessonDef.title}</h3><p>Изучите документ ниже.</p>`, sortIndex: 1 },
      ];
      if (videoFile) {
        contentBlocks.push({ lessonId: lesson.id, blockType: 'VIDEO' as any, mediaKey: `/uploads/${videoFile}`, sortIndex: 2 });
      }
      contentBlocks.push({ lessonId: lesson.id, blockType: 'FILE' as any, mediaKey: `/uploads/old-platform/${mod.folder}/${lessonDef.file}`, sortIndex: videoFile ? 3 : 2 });
      await prisma.lessonContent.createMany({ data: contentBlocks });
      totalPdfLessons++;
    }
  }

  // Миграция: убираем видео из неправильных уроков (старая логика ставила по globalLessonIdx)
  console.log('4.5/6 Очистка старых видео-блоков...');
  const allCourseChapters = await prisma.chapter.findMany({
    where: { courseId: course.id },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, orderIndex: true },
  });
  for (const ch of allCourseChapters) {
    const videoModuleFile = MODULE_VIDEOS[ch.orderIndex];
    const lessons = await prisma.lesson.findMany({
      where: { chapterId: ch.id },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, orderIndex: true },
    });
    for (const lesson of lessons) {
      if (videoModuleFile && lesson.orderIndex === 1) {
        // Этот урок ДОЛЖЕН иметь видео — не трогаем
        continue;
      }
      // Удаляем видео-блоки из уроков, где их быть не должно
      await prisma.lessonContent.deleteMany({
        where: { lessonId: lesson.id, blockType: 'VIDEO' },
      });
    }
  }

  console.log('5/6 Разблокировка для админа...');
  const allChapters = await prisma.chapter.findMany({ where: { courseId: course.id } });
  for (const ch of allChapters) {
    await prisma.userProgress.upsert({
      where: { userId_chapterId: { userId: admin.id, chapterId: ch.id } },
      update: { status: 'COMPLETED', bestScore: 100 },
      create: { userId: admin.id, chapterId: ch.id, status: 'COMPLETED', bestScore: 100 },
    });
  }
  const allLessons = await prisma.lesson.findMany({ where: { chapter: { courseId: course.id } } });
  for (const l of allLessons) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: admin.id, lessonId: l.id } },
      update: { completed: true },
      create: { userId: admin.id, lessonId: l.id, completed: true, videoProgress: {} },
    });
  }

  await prisma.$disconnect();
  console.log(`\n6/6 Готово! Админ: ${adminEmail} / ${pwd}`);
  console.log(`Курс: ${course.title} | Модулей: ${allChapters.length} | PDF уроков: ${totalPdfLessons}`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
