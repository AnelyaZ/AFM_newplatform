import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

function readStage2(): string {
  const root = path.resolve(__dirname, '..', '..');
  const p = path.resolve(root, 'stage2');
  if (!fs.existsSync(p)) throw new Error('stage2 file not found');
  return fs.readFileSync(p, 'utf8');
}

type Slice = { title: string; start: number; end?: number };

function planSlices(text: string): Slice[] {
  const indexOf = (needle: string) => text.indexOf(needle);
  const markers: { key: string; title: string; i: number }[] = [
    { key: 'Задачи:', title: 'Задачи ПФР', i: -1 },
    { key: 'Принципы:', title: 'Принципы, объекты, результаты и алгоритм ПФР', i: -1 },
    { key: 'Первый этап', title: 'Этап I — Сбор и обработка оперативной информации', i: -1 },
    { key: 'Второй этап', title: 'Этап II — Регистрация в КУИ/ЕРДР и расследование', i: -1 },
    { key: 'Особенности проведения обыска и выемки', title: 'Особенности проведения обыска и выемки', i: -1 },
    { key: 'Допрос подозреваемого', title: 'Допрос подозреваемого', i: -1 },
    { key: 'Особенности допроса свидетелей', title: 'Особенности допроса свидетелей', i: -1 },
    { key: 'Одной из важнейших моментов', title: 'Экспертные исследования: товароведческая и экономическая', i: -1 },
    { key: 'Третий этап', title: 'Этап III — Досудебная конфискация и возврат активов', i: -1 },
    { key: 'IV.', title: 'Международное сотрудничество', i: -1 },
    { key: 'V.', title: 'Иные вопросы проведения ПФР', i: -1 },
  ];

  // Compute indices
  for (const m of markers) {
    m.i = indexOf(m.key);
  }
  // Base introduction from start to first marker
  const present = markers.filter((m) => m.i >= 0).sort((a, b) => a.i - b.i);
  const slices: Slice[] = [];
  const firstIdx = present.length ? present[0].i : text.length;
  slices.push({ title: 'Введение', start: 0, end: firstIdx });
  // Add planned slices in order
  for (let x = 0; x < present.length; x += 1) {
    const cur = present[x];
    const next = present[x + 1];
    slices.push({ title: cur.title, start: cur.i, end: next ? next.i : undefined });
  }
  return slices;
}

function htmlFromSlice(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n');
  const paragraphs = text.split('\n');
  const body = paragraphs
    .map((p) => {
      if (p.trim().length === 0) return '<p><br/></p>';
      const esc = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<p>${esc}</p>`;
    })
    .join('');
  return `<div>${body}</div>`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const raw = readStage2();
    const slices = planSlices(raw);

    // Find course and stage 2 chapter
    const course = await prisma.course.findFirst({ where: { title: { equals: 'Базовый курс АФМ' } }, include: { chapters: { orderBy: { orderIndex: 'asc' } } } });
    if (!course) throw new Error('Course "Базовый курс АФМ" not found');
    const chapters = course.chapters || [];
    let target = chapters.find((c) => /этап/i.test(c.title) && /2/.test(c.title));
    if (!target) target = chapters.find((c) => c.orderIndex === 3) || chapters[2] || chapters[0];
    if (!target) throw new Error('Target chapter not found');

    // Delete existing lessons under target chapter
    const lessons = await prisma.lesson.findMany({ where: { chapterId: target.id }, select: { id: true } });
    const lessonIds = lessons.map((l) => l.id);
    if (lessonIds.length) {
      await prisma.lessonContent.deleteMany({ where: { lessonId: { in: lessonIds } } });
      await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
    }

    // Create curated lessons
    let order = 1;
    for (const s of slices) {
      const content = raw.slice(s.start, s.end ?? raw.length);
      const html = htmlFromSlice(content);
      const created = await prisma.lesson.create({ data: { chapterId: target.id, orderIndex: order++, title: s.title, description: null } });
      await prisma.lessonContent.create({ data: { lessonId: created.id, blockType: 'TEXT', textHtml: html, sortIndex: 1 } });
    }
    console.log(`Rebuilt ${slices.length} lessons for chapter: ${target.title}`);
  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


