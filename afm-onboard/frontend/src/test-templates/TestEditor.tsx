import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import type { TestStructure, EditableTestStructure, EditableBlock, EditableQuestion, QuestionType } from './types';
import { QUESTION_TYPE_CONFIG } from './types';

type Props = {
  initialData: TestStructure;
  onSave?: (data: TestStructure) => void;
  onEvaluate?: (data: TestStructure) => void;
  isLoading?: boolean;
  onChange?: (data: TestStructure, isDirty: boolean) => void;
};

export default function TestEditor({ initialData, onChange }: Props) {
  const [data, setData] = useState<EditableTestStructure>(() => normalize(initialData));
  const [activeTab] = useState<'content'>('content');
  const cloningRef = React.useRef(false);

  // Parse helper: recognize question, options (A/B/C/D) with ")" or "." and answer line
  const parsePastedQuestion = (raw: string): null | {
    question: string;
    options: { label: string; text: string }[];
    correctLabels: string[];
  } => {
    if (!raw) return null;
    const text = raw.replace(/\r\n?/g, '\n').trim();
    const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return null;

    // Find first option line index
    const optionRegex = /^\s*([A-Za-zА-Яа-я])\s*[\)\.]\s+(.+)$/;
    let firstOptIdx = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (optionRegex.test(lines[i])) { firstOptIdx = i; break; }
    }
    if (firstOptIdx === -1) return null;

    // Question text is before first option; strip numeric prefix like "1." or "1)"
    let question = lines.slice(0, firstOptIdx).join(' ').trim();
    question = question.replace(/^\s*\d+[\.|\)]\s*/, '');
    // Also strip leading "Вопрос ..." prefixes, e.g., "Вопрос:", "Вопрос 1:", "Вопрос 1)" etc.
    question = question.replace(/^\s*вопрос\s*\d*\s*[:\.)-]?\s*/i, '');
    if (!question) return null;

    // Collect options up to an optional Answer line
    const options: { label: string; text: string }[] = [];
    let answerLineIdx = -1;
    for (let i = firstOptIdx; i < lines.length; i += 1) {
      const m = lines[i].match(optionRegex);
      if (m) {
        const label = m[1].toLowerCase();
        const optText = m[2].trim();
        if (optText) options.push({ label, text: optText });
        continue;
      }
      // check for answer line
      if (/^(правильный\s*ответ|ответ)\s*[:\-]/i.test(lines[i])) { answerLineIdx = i; break; }
      // Stop at any unrelated line after options
      if (options.length > 0) break;
    }
    if (options.length < 2) return null;

    // Extract correct labels (normalize Cyrillic lookalikes to Latin)
    const norm = (ch: string) => {
      const up = ch.toUpperCase();
      if (up === 'А') return 'A';
      if (up === 'В') return 'B';
      if (up === 'С') return 'C';
      if (up === 'Д') return 'D';
      return up;
    };
    let correctLabels: string[] = [];
    if (answerLineIdx !== -1) {
      const answerText = lines[answerLineIdx].replace(/^(правильный\s*ответ|ответ)\s*[:\-]\s*/i, '');
      const letters = Array.from(answerText.matchAll(/[A-Za-zА-Яа-я]/g)).map((m) => norm(m[0]).toLowerCase());
      const seen = new Set<string>();
      for (const ch of letters) {
        if (options.some((o) => norm(o.label).toLowerCase() === ch) && !seen.has(ch)) seen.add(ch);
      }
      correctLabels = Array.from(seen);
    }

    return { question, options, correctLabels };
  };

  const splitIntoQuestionBlocks = (raw: string): string[] => {
    const text = raw.replace(/\r\n?/g, '\n').trim();
    const lines = text.split(/\n+/);
    const blocks: string[] = [];
    let current: string[] = [];
    const isHeader = (s: string) => {
      const t = (s || '').trim();
      if (/^\d+[\.)]\s+/.test(t)) return true;
      if (/^вопрос(\s+\d+)?\s*[\.)-]?\s*/i.test(t)) return true;
      return false;
    };
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (isHeader(line)) {
        if (current.length) blocks.push(current.join('\n'));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length) blocks.push(current.join('\n'));
    // If no headers detected at all, return the whole text as a single block
    if (blocks.length === 0) return [text];
    return blocks
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  };

  const parseManyPastedQuestions = (raw: string) => {
    const blocks = splitIntoQuestionBlocks(raw);
    const out: { question: string; options: { label: string; text: string }[]; correctLabels: string[] }[] = [];
    for (const b of blocks) {
      const p = parsePastedQuestion(b);
      if (p) out.push(p);
    }
    return out;
  };

  function normalize(src: any): EditableTestStructure {
    const base: EditableTestStructure = {
      metadata: src?.metadata || { title: '', language: 'rus', duration: '', totalPoints: 0 },
      blocks: Array.isArray(src?.blocks) ? src.blocks.map((b: any, i: number) => ({
        id: b.id || `b_${i}`,
        title: b.title || `Блок ${i + 1}`,
        type: (b.type as QuestionType) || 'single_choice',
        isCollapsed: false,
        isEditing: false,
        questions: Array.isArray(b.questions) ? b.questions.map((q: any, j: number) => ({
          id: q.id || `q_${i}_${j}`,
          text: q.text || '',
          type: (q.type as QuestionType) || 'single_choice',
          points: q.points || 1,
          options: Array.isArray(q.options) ? q.options : (q.options ? Object.entries(q.options).map(([k, v]: any, idx: number) => ({ id: String(k) || `opt_${idx}`, text: String(v), isCorrect: false })) : []),
          isEditing: false,
        })) : [],
      })) : [],
      evaluation: { criteria: [], gradingScale: [] },
      isDirty: false,
      version: 1,
    };
    return base;
  }

  const withPortal = (isDragging: boolean, node: React.ReactElement) =>
    isDragging ? createPortal(node, document.body) : node;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, type } = result;
    if (type === 'BLOCK') {
      const newBlocks = Array.from(data.blocks);
      const [reordered] = newBlocks.splice(source.index, 1);
      newBlocks.splice(destination.index, 0, reordered);
      setData((p) => ({ ...p, blocks: newBlocks, isDirty: true }));
    } else if (type === 'QUESTION') {
      const sb = parseInt(source.droppableId.split('-')[1]);
      const db = parseInt(destination.droppableId.split('-')[1]);
      const blocks = [...data.blocks];
      const sourceQs = Array.from(blocks[sb].questions);
      const [moved] = sourceQs.splice(source.index, 1);
      if (sb === db) {
        sourceQs.splice(destination.index, 0, moved);
        blocks[sb].questions = sourceQs;
      } else {
        const destQs = Array.from(blocks[db].questions);
        destQs.splice(destination.index, 0, moved);
        blocks[sb].questions = sourceQs;
        blocks[db].questions = destQs;
      }
      setData((p) => ({ ...p, blocks, isDirty: true }));
    }
  };

  const addBlock = () => {
    const nb: EditableBlock = { id: `b_${Date.now()}`, title: `Новый блок ${data.blocks.length + 1}`, type: 'single_choice', isCollapsed: false, isEditing: true, questions: [] };
    setData((p) => ({ ...p, blocks: [...p.blocks, nb], isDirty: true }));
  };
  const addQuestion = (bi: number) => {
    setData((p) => {
      const blocks = [...p.blocks];
      const currentType = blocks[bi]?.type as QuestionType;
      const nq: EditableQuestion = {
        id: `q_${Date.now()}`,
        text: '',
        type: currentType || 'single_choice',
        points: (currentType || 'single_choice') === 'multiple_choice' ? 2 : 1,
        options: [{ id: `o_${Date.now()}`, text: '', isCorrect: false }],
        isEditing: true,
      };
      blocks[bi] = { ...blocks[bi], questions: [...blocks[bi].questions, nq] };
      return { ...p, blocks, isDirty: true };
    });
  };
  const updateBlock = (bi: number, patch: Partial<EditableBlock>) => setData((p) => {
    const blocks = [...p.blocks];
    blocks[bi] = { ...blocks[bi], ...patch };
    return { ...p, blocks, isDirty: true };
  });
  const deleteBlock = (bi: number) => setData((p) => ({ ...p, blocks: p.blocks.filter((_, i) => i !== bi), isDirty: true }));
  const updateQuestion = (bi: number, qi: number, patch: Partial<EditableQuestion>) => setData((p) => {
    const blocks = [...p.blocks];
    blocks[bi].questions[qi] = { ...blocks[bi].questions[qi], ...patch } as EditableQuestion;
    return { ...p, blocks, isDirty: true };
  });
  const deleteQuestion = (bi: number, qid: string) => setData((p) => {
    const blocks = [...p.blocks];
    const block = { ...blocks[bi] };
    const questions = [...block.questions];
    const idx = questions.findIndex((x) => x.id === qid);
    if (idx >= 0) {
      questions.splice(idx, 1);
      block.questions = questions;
      blocks[bi] = block;
    }
    return { ...p, blocks, isDirty: true };
  });
  const addOption = (bi: number, qi: number) => setData((p) => {
    const blocks = [...p.blocks];
    const block = { ...blocks[bi] };
    const questions = [...block.questions];
    const oldQ = questions[qi];
    const newOptions = [...(oldQ.options || []), { id: `o_${Date.now()}`, text: '', isCorrect: false }];
    const newQ = { ...oldQ, options: newOptions };
    questions[qi] = newQ;
    block.questions = questions;
    blocks[bi] = block;
    return { ...p, blocks, isDirty: true };
  });
  const removeOption = (bi: number, qi: number, oi: number) => setData((p) => {
    const blocks = [...p.blocks];
    const q = blocks[bi].questions[qi];
    q.options?.splice(oi, 1);
    return { ...p, blocks, isDirty: true };
  });

  // Сохранение выполняется внешней кнопкой через onSave проп

  // Репортим наружу актуальные данные для внешней кнопки сохранения
  React.useEffect(() => {
    if (!onChange) return;
    const clean: TestStructure = {
      ...data,
      blocks: data.blocks.map((b) => ({
        ...b,
        questions: b.questions.map(({ isEditing, ...q }) => q),
      })),
    } as any;
    onChange(clean, !!data.isDirty);
  }, [data]);

  // Сброс внутреннего флага грязности при полном совпадении с initialData (после сохранения родителем)
  React.useEffect(() => {
    // глубоко сравниваем нормализованные структуры без isEditing
    const normalizeForCompare = (src: any) => ({
      ...src,
      blocks: (src?.blocks || []).map((b: any) => ({
        ...b,
        questions: (b.questions || []).map(({ isEditing: _ie, ...q }: any) => q),
      })),
    });
    try {
      const a = JSON.stringify(normalizeForCompare(data));
      const b = JSON.stringify(normalizeForCompare(normalize(initialData)));
      if (a === b && data.isDirty) {
        setData((p) => ({ ...p, isDirty: false }));
      }
    } catch {}
  }, [initialData]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="p-2 sm:p-4">
        {activeTab === 'content' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="blocks" type="BLOCK">
              {(provided: any) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 relative">
                  {data.blocks.map((block, bi) => (
                    <Draggable draggableId={block.id} index={bi} key={block.id}>
                      {(prov: any, snap: any) => withPortal(snap.isDragging, (
                        <div ref={prov.innerRef} {...prov.draggableProps} style={prov.draggableProps.style} className={`border rounded-lg p-3 ${snap.isDragging ? 'shadow-lg' : 'shadow-sm'} border-black/10 dark:border-white/10 bg-white dark:bg-white/5`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
                            <div {...prov.dragHandleProps} className="cursor-grab"><GripVertical className="w-5 h-5 text-gray-400" /></div>
                            {block.isEditing ? (
                              <input value={block.title} onChange={(e) => updateBlock(bi, { title: e.target.value })} onBlur={() => updateBlock(bi, { isEditing: false })} className="flex-1 min-w-0 text-lg font-semibold bg-transparent border-b border-sky-400 focus:outline-none dark:text-gray-100" autoFocus />
                            ) : (
                              <h3 className="flex-1 min-w-0 text-lg font-semibold cursor-pointer hover:text-sky-600 dark:text-gray-100 truncate" onClick={() => updateBlock(bi, { isEditing: true })}>{block.title}</h3>
                            )}
                            <div className="flex items-center gap-2 sm:ml-auto">
                              <button onClick={() => updateBlock(bi, { isCollapsed: !block.isCollapsed })} className="p-1 text-gray-400 hover:text-gray-600">
                                {block.isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                              <button onClick={() => deleteBlock(bi)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>

                           {!block.isCollapsed && (
                              <Droppable droppableId={`questions-${bi}`} type="QUESTION" renderClone={(cloneProvided: any, _cloneSnapshot: any, rubric: any) => {
                               const sourceIndex = rubric.source.index;
                               const q = data.blocks[bi].questions[sourceIndex];
                               return (
                                 <div ref={cloneProvided.innerRef} {...cloneProvided.draggableProps} {...cloneProvided.dragHandleProps} style={cloneProvided.draggableProps.style} className="border rounded p-3 shadow-lg border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                   <div className="flex items-start gap-3">
                                     <div className="cursor-grab mt-1"><GripVertical className="w-4 h-4 text-gray-400" /></div>
                                     <div className="flex-1">
                                       <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{q.text || 'Вопрос'}</div>
                                     </div>
                                   </div>
                                 </div>
                               );
                             }}>
                                {(p2: any) => (
                                <div {...p2.droppableProps} ref={p2.innerRef} className="space-y-3 relative">
                                  {block.questions.map((q, qi) => (
                                    <Draggable key={q.id} draggableId={q.id} index={qi}>
                                      {(p3: any, s3: any) => (
                                        <div ref={p3.innerRef} {...p3.draggableProps} style={p3.draggableProps.style} className={`border rounded p-2 ${s3.isDragging ? 'shadow-lg' : ''} border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5`}>
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                                             <div {...p3.dragHandleProps} className="cursor-grab sm:mt-1"><GripVertical className="w-4 h-4 text-gray-400" /></div>
                                             <div className="sm:mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 dark:from-sky-600 dark:to-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-sm ring-2 ring-sky-300/40 dark:ring-sky-500/40 flex items-center justify-center select-none">{qi + 1}</div>
                                            <div className="flex-1 space-y-3 min-w-0">
          <textarea
            value={q.text}
            onChange={(e) => updateQuestion(bi, qi, { text: e.target.value })}
            onPaste={(e) => {
              const txt = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
              const many = parseManyPastedQuestions(txt);
              if (!many || many.length === 0) return; // allow default paste if not matching template
              e.preventDefault();
              setData((p) => {
                const blocks = [...p.blocks];
                const block = { ...blocks[bi] };
                const questions = [...block.questions];
                const time = Date.now();
                // Build first from parsed[0]
                const buildFromParsed = (parsed: { question: string; options: { label: string; text: string }[]; correctLabels: string[] }, seed: number): EditableQuestion => {
                  const opts = parsed.options.map((o, idx) => ({ id: `o_${seed}_${idx}`, text: o.text, isCorrect: parsed.correctLabels.includes(o.label) }));
                  const correctCount = opts.filter((o) => o.isCorrect).length;
                  const type: QuestionType = correctCount > 1 ? 'multiple_choice' : 'single_choice';
                  const points = type === 'multiple_choice' ? 2 : 1;
                  return { id: `q_${seed}`, text: parsed.question, type, points, options: opts, isEditing: false } as EditableQuestion;
                };
                const first = buildFromParsed(many[0], time);
                // Replace current question with first
                const before = questions.slice(0, qi);
                const after = questions.slice(qi + 1);
                const news: EditableQuestion[] = [];
                for (let i = 1; i < many.length; i += 1) {
                  news.push(buildFromParsed(many[i], time + i));
                }
                block.questions = [...before, first, ...news, ...after];
                blocks[bi] = block;
                return { ...p, blocks, isDirty: true };
              });
            }}
            placeholder="Введите текст вопроса..."
            className="w-full p-2 border rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base dark:bg-transparent dark:text-gray-100 dark:placeholder-gray-400 dark:border-white/10"
            rows={3}
          />
                                              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                <select value={q.type} onChange={(e) => {
                                                  const nextType = e.target.value as QuestionType;
                                                  // Если переключаемся на множественный выбор — поднять минимум баллов до 2
                                                  if (nextType === 'multiple_choice' && (q.points || 0) < 2) {
                                                    updateQuestion(bi, qi, { type: nextType, points: 2 });
                                                  } else {
                                                    updateQuestion(bi, qi, { type: nextType });
                                                  }
                                                }} className="afm-select text-sm max-w-[60%] sm:max-w-none">
                                                  {Object.entries(QUESTION_TYPE_CONFIG)
                                                    .map(([type, cfg]) => (<option key={type} value={type}>{cfg.name}</option>))}
                                                </select>
                                                <label className="flex items-center gap-2 text-sm">
                                                  <span>Баллы:</span>
                                                  <input type="number" value={q.points} onChange={(e) => {
                                                    const raw = parseInt(e.target.value);
                                                    const minVal = q.type === 'multiple_choice' ? 2 : 1;
                                                    const val = isNaN(raw) ? minVal : Math.max(minVal, Math.min(100, raw));
                                                    updateQuestion(bi, qi, { points: val });
                                                  }} min={q.type === 'multiple_choice' ? 2 : 1} max={100} className="w-16 px-2 py-1 border rounded text-center text-sm dark:bg-transparent dark:text-gray-100 dark:border-white/10" />
                                                </label>
                                              </div>

                                              {QUESTION_TYPE_CONFIG[q.type]?.hasOptions && (
                                                <div className="space-y-3">
                                                  {(q.options || []).map((opt, oi) => (
                                                    <div key={opt.id} className="flex items-center gap-2 sm:gap-3">
                                                       <input type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={`correct-${q.id}`} checked={!!opt.isCorrect} onChange={(e) => {
                                                        if (q.type === 'single_choice') {
                                                          const newOpts = (q.options || []).map((o, idx) => ({ ...o, isCorrect: idx === oi ? e.target.checked : false }));
                                                          updateQuestion(bi, qi, { options: newOpts });
                                                        } else {
                                                          // multiple_choice: максимум 3 правильных
                                                          const currentCorrect = (q.options || []).filter((o) => o.isCorrect).length;
                                                          if (e.target.checked && currentCorrect >= 3) {
                                                            // игнорируем попытку превысить лимит
                                                            return;
                                                          }
                                                          const newOpts = [...(q.options || [])];
                                                          newOpts[oi].isCorrect = e.target.checked;
                                                          updateQuestion(bi, qi, { options: newOpts });
                                                        }
                                                      }} className="afm-check flex-shrink-0" />
                                                      <input type="text" value={opt.text} onChange={(e) => {
                                                        const newOpts = [...(q.options || [])];
                                                        newOpts[oi].text = e.target.value;
                                                        updateQuestion(bi, qi, { options: newOpts });
                                                      }} placeholder={`Вариант ${String.fromCharCode(65 + oi)}`} className="flex-1 min-w-0 px-3 py-2 border rounded text-sm dark:bg-transparent dark:text-gray-100 dark:border-white/10" />
                                                      {(q.options?.length || 0) > 2 && (
                                                        <button onClick={() => removeOption(bi, qi, oi)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                      )}
                                                    </div>
                                                  ))}
                                                  <button onClick={() => addOption(bi, qi)} className="text-sky-600 text-sm hover:text-sky-700">+ Добавить вариант</button>
                                                  {q.type === 'multiple_choice' && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                      Отметьте 2–3 правильных варианта. Максимум три правильных ответа. Минимум баллов для этого типа — 2.
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex flex-row sm:flex-col gap-1 sm:ml-1">
                                              <button onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (cloningRef.current) return;
                                                cloningRef.current = true;
                                                const uniqueId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                                                const clone: EditableQuestion = { ...q, id: uniqueId, text: `${q.text} (копия)`, isEditing: false };
                                                setData((p) => {
                                                  const blocks = [...p.blocks];
                                                  blocks[bi].questions.splice(qi + 1, 0, clone);
                                                  return { ...p, blocks, isDirty: true };
                                                });
                                                setTimeout(() => { cloningRef.current = false; }, 0);
                                              }} className="p-1 text-gray-400 hover:text-gray-600" title="Копировать"><Copy className="w-4 h-4" /></button>
                                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteQuestion(bi, q.id); }} className="p-1 text-red-400 hover:text-red-600" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {p2.placeholder}
                                  <button onClick={() => addQuestion(bi)} className="w-full p-3 border border-dashed border-gray-300 dark:border-white/10 rounded text-gray-500 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600">
                                    <Plus className="w-4 h-4 mx-auto" />
                                  </button>
                                </div>
                              )}
                            </Droppable>
                          )}
                           {block.isCollapsed && (
                             <div className="text-xs text-gray-500 dark:text-gray-400">Вопросов: {block.questions.length}</div>
                           )}
                        </div>
                      ))}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <button onClick={addBlock} className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600">
                    <Plus className="w-5 h-5 mx-auto mb-2" /> Добавить новый блок
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}


