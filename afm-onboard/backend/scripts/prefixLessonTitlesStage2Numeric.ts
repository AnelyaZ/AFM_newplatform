import { PrismaClient } from '@prisma/client';

function stripExistingPrefix(title: string): string {
  let t = title.trim();
  // Remove "Урок номер ..." prefix
  t = t.replace(/^\s*Урок\s+номер\s+\S+\s+/i, '');
  // Remove "Урок N." numeric prefix
  t = t.replace(/^\s*Урок\s+\d+\.\s*/i, '');
  return t.trim();
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const course = await prisma.course.findFirst({ where: { title: { equals: 'Базовый курс АФМ' } }, include: { chapters: { orderBy: { orderIndex: 'asc' } } } });
    if (!course) throw new Error('Course not found');
    const chapters = course.chapters || [];
    let target = chapters.find((c) => /этап/i.test(c.title) && /2/.test(c.title));
    if (!target) target = chapters.find((c) => c.orderIndex === 3) || chapters[2] || chapters[0];
    if (!target) throw new Error('Stage 2 chapter not found');

    const lessons = await prisma.lesson.findMany({ where: { chapterId: target.id }, orderBy: { orderIndex: 'asc' } });
    if (!lessons.length) return console.log('No lessons');

    for (let i = 0; i < lessons.length; i += 1) {
      const lesson = lessons[i];
      if (i === 0) continue; // keep introduction as is
      const n = i; // 2nd lesson -> 1, etc
      const rest = stripExistingPrefix(lesson.title);
      const nextTitle = `Урок ${n}. ${rest}`;
      if (lesson.title !== nextTitle) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { title: nextTitle } });
        console.log(`Updated: ${nextTitle}`);
      }
    }
    console.log('Done numeric prefixing');
  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


