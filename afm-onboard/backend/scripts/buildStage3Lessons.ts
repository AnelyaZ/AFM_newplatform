import { PrismaClient } from '@prisma/client';

// Source content provided by user (kept verbatim for paragraphs and lists)
const SRC = `Расследование преступлений, связанных с выпиской фиктивных счетов-фактур (ФСФ), является одним из наиболее трудоемких направлений в сфере экономической преступности. В строительной отрасли, особенно при освоении бюджетных средств, фиктивные счета-фактуры часто применяются как инструмент для обналичивания денег, уклонения от налогов и сокрытия хищений. По ст. 216 УК РК («выписка счета-фактуры без фактического выполнения работ, оказания услуг или отгрузки товаров») регистрируются дела, где выявлен один из двух основных способов схем обналичивания.
	1. Основные способы обналичивания денежных средств
	Первый способ – перечисление средств контрагентами-покупателями на счета «поставщиков», выступающих лжефирмами. После поступления средств они снимаются через банкоматы или кассы банков второго уровня (БВУ), при этом 90–95% средств возвращаются инициатору схемы за вычетом «комиссии» обнальщика (3–10%). Это наиболее распространенная модель.
	Второй способ – выписка фиктивных счетов без фактического перечисления средств, но с их последующим включением в налоговую отчетность с целью снижения налоговой нагрузки или имитации хозяйственной деятельности. В обоих случаях поставщик (лжепредприниматель) получает «доход» в виде процента от суммы ФСФ — от 0,1 до 10%.
	2. Признаки фиктивных операций и контрагентов
	Следователь при анализе бухгалтерских документов и ЭСФ должен обращать внимание на ряд типичных признаков, свидетельствующих о фиктивности:
Юридические адреса всех поставщиков совпадают или массово зарегистрированы по одному адресу;
Все фирмы задействованы в цепочке поставок, но отсутствуют сведения о персонале, транспорте, складах;
Повторяющиеся IP-адреса при выписке ЭСФ;
Снятие почти всех поступивших средств в течение 1–3 банковских дней;
Отсутствие пенсионных и социальных отчислений;
Одинаковые контактные данные, общие почтовые ящики;
Реорганизация или ликвидация компаний вскоре после исполнения контрактов.
	Эти признаки позволяют установить схему обнала, а также обоснованно переквалифицировать действия на состав ст. 216 УК РК.
	3. Алгоритм действий следователя
	Следственные действия по делам, связанным с обналичиванием средств через ФСФ, включают следующие ключевые этапы:
Блокировка ЭСФ в системе налоговых органов, чтобы исключить возможность их удаления или изменения;
Выемка документов: договоров, актов, счетов, отчетов о движении средств, налоговых деклараций;
Анализ логов входа в ЭСФ: установить IP-адреса, время входа, кто подписывал документы;
Допросы: бухгалтеров, директоров, номинальных руководителей, водителей, кассиров;
Изъятие техники и носителей информации: ЭЦП, компьютеры, серверы, флешки;
Назначение экспертиз: бухгалтерской, почерковедческой, компьютерно-технической;
Сравнение ЭСФ с отчетами ФНО 300.00 и 100.00, выявление расхождений;
Проверка фактической хозяйственной деятельности: наличие складов, техники, лицензий;
Формирование схемы цепочки поставок через аналитический отчет «Пирамида».
	4. Документирование преступного дохода
	Следствие должно установить объем незаконного дохода — размер вознаграждения, полученного поставщиком ФСФ. Это и есть «преступный доход», который в дальнейшем подлежит квалификации по ст. 218 УК РК (легализация). Следователь обязан получить сведения о расходах, активах фигурантов, попытках легализации средств через покупку недвижимости, автомобилей, оффшорные переводы или криптовалютные транзакции.`;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function p(str: string) {
  if (!str.trim()) return '<p><br/></p>';
  return `<p>${esc(str)}</p>`;
}

function ul(items: string[]) {
  const lis = items.map((it) => `<li>${esc(it)}</li>`).join('');
  return `<ul>${lis}</ul>`;
}

function buildLessons() {
  // Split SRC into parts by numbered headers
  const idx1 = SRC.indexOf('1.');
  const idx2 = SRC.indexOf('2.');
  const idx3 = SRC.indexOf('3.');
  const idx4 = SRC.indexOf('4.');
  const intro = SRC.substring(0, idx1 > -1 ? idx1 : SRC.length).trim();
  const part1 = SRC.substring(idx1, idx2 > -1 ? idx2 : SRC.length).trim();
  const part2 = idx2 > -1 ? SRC.substring(idx2, idx3 > -1 ? idx3 : SRC.length).trim() : '';
  const part3 = idx3 > -1 ? SRC.substring(idx3, idx4 > -1 ? idx4 : SRC.length).trim() : '';
  const part4 = idx4 > -1 ? SRC.substring(idx4).trim() : '';

  // Build HTML blocks
  const introHtml = `<div>${p(intro)}</div>`;

  // Part 1: two bolded subparagraphs
  const p1Lines = part1.split('\n').map((l) => l.trim()).filter(Boolean);
  const title1 = 'Урок 1. Основные способы обналичивания денежных средств';
  const firstPara = p1Lines.find((l) => l.startsWith('Первый способ')) || '';
  const secondPara = p1Lines.find((l) => l.startsWith('Второй способ')) || '';
  const p1html = `<div>${p1Lines[0].startsWith('1.') ? p(p1Lines[0]) : ''}<p><strong>Первый способ.</strong> ${esc(firstPara.replace(/^Первый способ\s*[–-]\s*/, '')).trim()}</p><p><strong>Второй способ.</strong> ${esc(secondPara.replace(/^Второй способ\s*[–-]\s*/, '')).trim()}</p></div>`;

  // Part 2: lead + bullet list + closing line
  const p2Lines = part2.split('\n').map((l) => l.trim()).filter(Boolean);
  const title2 = 'Урок 2. Признаки фиктивных операций и контрагентов';
  const leadIdx2 = 0;
  const lead2 = p2Lines[leadIdx2] || '';
  const bullets2 = p2Lines.slice(leadIdx2 + 1).filter((l) => !l.startsWith('Эти признаки'));
  const closing2 = p2Lines.find((l) => l.startsWith('Эти признаки')) || '';
  const p2html = `<div>${p(lead2)}${ul(bullets2)}${closing2 ? p(closing2) : ''}</div>`;

  // Part 3: lead + bullet list
  const p3Lines = part3.split('\n').map((l) => l.trim()).filter(Boolean);
  const title3 = 'Урок 3. Алгоритм действий следователя';
  const lead3 = p3Lines[1] && p3Lines[0].startsWith('3.') ? p3Lines[1] : p3Lines[0];
  const startIdx3 = p3Lines.findIndex((l) => l === lead3);
  const bullets3 = p3Lines.slice((startIdx3 >= 0 ? startIdx3 + 1 : 1));
  const p3html = `<div>${p(lead3)}${ul(bullets3)}</div>`;

  // Part 4: paragraphs
  const p4Lines = part4.split('\n').map((l) => l.trim());
  const title4 = 'Урок 4. Документирование преступного дохода';
  const p4html = `<div>${p4Lines.map((line) => p(line)).join('')}</div>`;

  return [
    { title: 'Введение', html: introHtml },
    { title: title1, html: p1html },
    { title: title2, html: p2html },
    { title: title3, html: p3html },
    { title: title4, html: p4html },
  ];
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const course = await prisma.course.findFirst({ where: { title: { equals: 'Базовый курс АФМ' } }, include: { chapters: { orderBy: { orderIndex: 'asc' } } } });
    if (!course) throw new Error('Course "Базовый курс АФМ" not found');
    const chapters = course.chapters || [];
    let target = chapters.find((c: { title: string }) => /Этап\s*№?3/i.test(c.title));
    if (!target) target = chapters.find((c: { orderIndex: number }) => c.orderIndex === 5) || chapters[4];
    if (!target) throw new Error('Target chapter (Этап №3) not found');

    // Clean existing lessons to avoid duplicates
    const existing = await prisma.lesson.findMany({ where: { chapterId: target.id }, select: { id: true } });
    if (existing.length) {
      await prisma.lessonContent.deleteMany({ where: { lessonId: { in: existing.map((x: { id: string }) => x.id) } } });
      await prisma.lesson.deleteMany({ where: { id: { in: existing.map((x: { id: string }) => x.id) } } });
    }

    const lessons = buildLessons();
    let order = 1;
    for (const l of lessons) {
      const created = await prisma.lesson.create({ data: { chapterId: target.id, orderIndex: order++, title: l.title, description: null } });
      await prisma.lessonContent.create({ data: { lessonId: created.id, blockType: 'TEXT', textHtml: l.html, sortIndex: 1 } });
    }
    console.log(`Created ${lessons.length} lessons under chapter: ${target.title}`);
  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


