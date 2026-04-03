import { PrismaClient } from '@prisma/client';

const WORDS = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
  'двадцать',
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const course = await prisma.course.findFirst({ where: { title: { equals: 'Базовый курс АФМ' } }, include: { chapters: { orderBy: { orderIndex: 'asc' } } } });
    if (!course) throw new Error('Course not found');
    const chapters = course.chapters || [];
    let target = chapters.find((c) => /этап/i.test(c.title) && /2/.test(c.title));
    if (!target) target = chapters.find((c) => c.orderIndex === 3) || chapters[2] || chapters[0];
    if (!target) throw new Error('Target stage 2 chapter not found');

    const lessons = await prisma.lesson.findMany({ where: { chapterId: target.id }, orderBy: { orderIndex: 'asc' } });
    if (!lessons.length) return console.log('No lessons to update');

    for (let i = 0; i < lessons.length; i += 1) {
      const lesson = lessons[i];
      if (i === 0) continue; // keep introduction as is
      const countIndex = i; // second lesson => 1 => "один"
      const word = WORDS[countIndex] || String(countIndex);
      const already = /^\s*Урок номер\s+/i.test(lesson.title);
      if (already) continue;
      const nextTitle = `Урок номер ${word} ${lesson.title}`;
      await prisma.lesson.update({ where: { id: lesson.id }, data: { title: nextTitle } });
      console.log(`Updated: ${nextTitle}`);
    }
    console.log('Done prefixing lesson titles');
  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


