import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// This script finds course "Базовый курс АФМ" -> chapter with title containing "этап" and "2"
// Then splits provided text into lessons:
// - Intro until first heading line becomes first lesson (title: "Введение")
// - Each subsequent heading line starts a new lesson with that heading as title; content preserves paragraphs verbatim

function readStage2File(): string {
  const root = path.resolve(__dirname, '..', '..');
  const candidate = path.resolve(root, 'stage2');
  if (!fs.existsSync(candidate)) throw new Error('stage2 file not found at project root');
  return fs.readFileSync(candidate, 'utf8');
}

function splitLessons(raw: string): { title: string; paragraphs: string[] }[] {
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const lessons: { title: string; paragraphs: string[] }[] = [];
  let currentTitle: string | null = null;
  let currentParagraphs: string[] = [];

  const isHeading = (line: string): boolean => {
    // Treat lines that look like top-level headings as lesson titles: non-empty, not starting with a tab/bullet/numbered list prefix
    const s = line.trim();
    if (s.length === 0) return false;
    if (/^(\d+\.|\d+\)|[\-•\*]\s)/.test(s)) return false;
    // Long all-caps words or lines ending with ':' are headings, but allow regular sentences.
    // Heuristic: if next non-empty line looks like a paragraph (starts with letter/number), we still treat explicit blank-line-separated titles as headings.
    // Simpler rule: consider any non-empty line that is surrounded by blank lines as a heading.
    return true;
  };

  let i = 0;
  // First, gather an intro until first heading we decide to treat as title
  // We will consider the first contiguous non-empty run as intro if it doesn't look like a standalone heading
  const introParagraphs: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().length === 0) { introParagraphs.push(''); i += 1; continue; }
    // Stop intro when we see a heading and there is already some intro content
    if (isHeading(line) && introParagraphs.filter((x) => x.trim().length > 0).length > 0) break;
    introParagraphs.push(line);
    i += 1;
  }
  const introText = introParagraphs.join('\n').trim();
  if (introText.length > 0) {
    lessons.push({ title: 'Введение', paragraphs: introParagraphs });
  }

  // Process remaining: whenever encounter a non-empty line, start a new lesson title; collect until next title
  let pendingTitle: string | null = null;
  let buffer: string[] = [];
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length === 0) {
      buffer.push('');
      continue;
    }
    if (pendingTitle == null) {
      // start new lesson
      pendingTitle = line.trim();
      buffer = [];
    } else {
      // content lines
      // If we detect a strong heading (surrounded by blank line before and after), finalize current and start new
      // Here we peek next line to decide minimalistically: if previous was blank and this line is non-blank and buffer has content, treat it as content.
      buffer.push(line);
    }
    // Detect next title by lookahead: if next non-empty line is a standalone and there is at least one blank line before it
    const next = i + 1 < lines.length ? lines[i + 1] : '';
    if (pendingTitle && buffer.length > 0 && next.trim().length > 0 && lines[i].trim().length === 0) {
      // not reliable; we will finalize later
    }
    // Title boundaries are tricky; instead, finalize when we see another candidate title preceded by a blank line
    if (pendingTitle && i + 1 < lines.length) {
      const j = i + 1;
      // find first non-empty ahead
      let k = j;
      while (k < lines.length && lines[k].trim().length === 0) k += 1;
      if (k < lines.length && isHeading(lines[k]) && buffer.length > 0) {
        lessons.push({ title: pendingTitle, paragraphs: buffer });
        pendingTitle = null;
        i = k - 1; // will start at heading next loop
        buffer = [];
      }
    }
  }
  if (pendingTitle) {
    lessons.push({ title: pendingTitle, paragraphs: buffer });
  }
  // Normalize: ensure paragraphs preserved exactly; trim only trailing newlines
  return lessons.map((l) => ({ title: l.title.trim(), paragraphs: l.paragraphs }));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const raw = readStage2File();
    const parts = splitLessons(raw);
    if (parts.length === 0) throw new Error('No lessons parsed from stage2');

    // Find course and chapter ids
    const course = await prisma.course.findFirst({ where: { title: { equals: 'Базовый курс АФМ' } } });
    if (!course) throw new Error('Course "Базовый курс АФМ" not found');
    const chapter = await prisma.chapter.findFirst({ where: { courseId: course.id, title: { contains: 'этап', mode: 'insensitive' } }, orderBy: { orderIndex: 'asc' } });
    if (!chapter) throw new Error('Chapter for этап №2 not found (title contains "этап")');

    // Heuristic: pick chapter with orderIndex == 3 (этап №2 as third module), otherwise fallback to found chapter
    const stage2 = await prisma.chapter.findFirst({ where: { courseId: course.id, orderIndex: 3 } }) || chapter;

    const existingLessons = await prisma.lesson.findMany({ where: { chapterId: stage2.id }, orderBy: { orderIndex: 'asc' } });
    let nextOrder = (existingLessons[existingLessons.length - 1]?.orderIndex ?? 0) + 1;

    for (const l of parts) {
      const created = await prisma.lesson.create({ data: { chapterId: stage2.id, orderIndex: nextOrder++, title: l.title, description: null } });
      // Save content as a single TEXT block preserving paragraphs; join with newlines
      const html =
        '<div>' +
        l.paragraphs
          .map((p) => {
            if (p.trim().length === 0) return '<p><br/></p>';
            // Escape HTML special chars minimally
            const esc = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<p>${esc}</p>`;
          })
          .join('') +
        '</div>';
      await prisma.lessonContent.create({ data: { lessonId: created.id, blockType: 'TEXT', textHtml: html, sortIndex: 1 } });
      // small delay to keep order stable if needed
    }
    console.log(`Imported ${parts.length} lessons into chapter ${stage2.title}`);
  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


