import { PrismaClient } from '@prisma/client';
import { readdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const BASE_COURSE_ID = '11111111-1111-1111-1111-111111111111';

// Маппинг PDF файлов по категориям → новые модули курса
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

async function main() {
  // Get admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Admin user not found. Run main seed first.');

  // Check course exists
  const course = await prisma.course.findUnique({ where: { id: BASE_COURSE_ID } });
  if (!course) throw new Error('Base course not found. Run main seed first.');

  // Get current max orderIndex for chapters
  const lastChapter = await prisma.chapter.findFirst({
    where: { courseId: BASE_COURSE_ID },
    orderBy: { orderIndex: 'desc' },
  });
  let nextOrder = (lastChapter?.orderIndex ?? 0) + 1;

  let totalLessons = 0;

  for (const mod of PDF_MODULES) {
    console.log(`\nМодуль: ${mod.title}`);

    // Create chapter (module)
    const chapter = await prisma.chapter.create({
      data: {
        courseId: BASE_COURSE_ID,
        orderIndex: nextOrder++,
        title: mod.title,
        description: mod.description,
        passScore: mod.passScore,
        isPublished: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });

    // Create chapter intro content
    await prisma.chapterContent.create({
      data: {
        chapterId: chapter.id,
        blockType: 'TEXT',
        textHtml: `<h2>${mod.title}</h2><p>${mod.description}</p><p>Количество документов: ${mod.lessons.length}</p>`,
        sortIndex: 1,
      },
    });

    // Create lessons with PDF content
    for (let i = 0; i < mod.lessons.length; i++) {
      const lessonDef = mod.lessons[i];
      const mediaKey = `/uploads/old-platform/${mod.folder}/${lessonDef.file}`;

      const lesson = await prisma.lesson.create({
        data: {
          chapterId: chapter.id,
          orderIndex: i + 1,
          title: lessonDef.title,
          description: `PDF документ: ${lessonDef.file}`,
        },
      });

      await prisma.lessonContent.createMany({
        data: [
          {
            lessonId: lesson.id,
            blockType: 'TEXT' as any,
            textHtml: `<h3>${lessonDef.title}</h3><p>Изучите документ ниже. Для скачивания нажмите на ссылку.</p>`,
            sortIndex: 1,
          },
          {
            lessonId: lesson.id,
            blockType: 'FILE' as any,
            mediaKey,
            sortIndex: 2,
          },
        ],
      });

      totalLessons++;
    }

    console.log(`  Создано уроков: ${mod.lessons.length}`);
  }

  await prisma.$disconnect();
  console.log(`\n=== Готово! ===`);
  console.log(`Модулей: ${PDF_MODULES.length}`);
  console.log(`Уроков: ${totalLessons}`);
  console.log(`Все PDF привязаны к курсу "${course.title}"`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
