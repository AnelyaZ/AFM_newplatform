import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { uploadFileWithProgress } from '../lib/uploadFile';
import { toMediaUrl } from '../lib/media';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import UploadProgress from '../components/ui/UploadProgress';
// TextArea removed from test builder; still available elsewhere if needed
import { useToast } from '../components/Toaster';
import TestEditor from '../test-templates/TestEditor';
import type { TestStructure } from '../test-templates/types';

type Chapter = {
  id: string;
  courseId: string;
  orderIndex: number;
  title: string;
  description?: string;
  passScore: number;
  _count?: { lessons?: number };
};

type Block = { id?: string; blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number };
type Lesson = { id: string; orderIndex: number; title: string; description?: string | null; contents: Block[] };

// Компонент тумблера
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
          checked ? 'bg-sky-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  const sanitizeHtml = (html: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const all = doc.body.querySelectorAll('*');
      all.forEach((el) => {
        el.removeAttribute('style');
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
        // unwrap <font> tags if any
        if (el.tagName === 'FONT') {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
        }
      });
      return doc.body.innerHTML;
    } catch {
      return html;
    }
  };

  const isSelectionInsideEditor = () => {
    const sel = window.getSelection();
    const anchorNode = sel && sel.anchorNode;
    const editor = ref.current;
    if (!sel || !anchorNode || !editor) return false;
    return editor.contains(anchorNode);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!isSelectionInsideEditor()) return;
    savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const editor = ref.current;
    const range = savedRangeRef.current;
    if (!editor || !range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const apply = (cmd: string, val?: string) => {
    // Ensure focus and selection are inside editor before applying command
    ref.current?.focus();
    if (!isSelectionInsideEditor()) restoreSelection();
    // If still no selection, place caret at end
    const editor = ref.current;
    if (editor) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !isSelectionInsideEditor()) {
        const range = document.createRange();
        if (editor.childNodes.length > 0) {
          const last = editor.childNodes[editor.childNodes.length - 1];
          range.selectNodeContents(last);
          range.collapse(false);
        } else {
          const p = document.createElement('p');
          p.appendChild(document.createElement('br'));
          editor.appendChild(p);
          range.selectNodeContents(p);
          range.collapse(true);
        }
        const s = window.getSelection();
        if (s) { s.removeAllRanges(); s.addRange(range); }
      }
    }
    // Try the command; for formatBlock, try both uppercase and lowercase tags just in case
    if (cmd === 'formatBlock' && val) {
      const ok = document.execCommand(cmd, false, val);
      if (!ok) {
        document.execCommand(cmd, false, val.toLowerCase());
      }
    } else if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
      document.execCommand(cmd, false, val);
      // Verify a list actually exists around the caret; otherwise inject skeleton
      let hasList = false;
      const s = window.getSelection();
      const ed = ref.current;
      if (s && ed && s.rangeCount > 0) {
        let node: Node | null = s.anchorNode as Node | null;
        while (node && node !== ed) {
          const el = node as HTMLElement;
          if (el && (el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'LI')) { hasList = true; break; }
          node = node.parentNode;
        }
      }
      if (!hasList) {
        const isOrdered = cmd === 'insertOrderedList';
        const html = isOrdered ? '<ol><li><br></li></ol>' : '<ul><li><br></li></ul>';
        document.execCommand('insertHTML', false, html);
      }
    } else {
      document.execCommand(cmd, false, val);
    }
    // After applying, save the new selection state
    saveSelection();
  };

  // Обновляем DOM HTML только когда редактор не в фокусе,
  // чтобы не сбрасывать позицию каретки при наборе
  useEffect(() => {
    if (focused) return;
    const el = ref.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value, focused]);

  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    // Set default paragraph separator to <p> for consistent behavior
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
    const handleSelectionChange = () => {
      if (focused && isSelectionInsideEditor()) saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [focused]);

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-black/10 p-1 dark:border-white/10">
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('bold')}>B</button>
        <button type="button" className="rounded px-2 py-1 text-sm italic hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('italic')}>I</button>
        <button type="button" className="rounded px-2 py-1 text-sm underline hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('underline')}>U</button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('formatBlock', 'H2')}>H2</button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('formatBlock', 'H3')}>H3</button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('insertUnorderedList')}>• List</button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('insertOrderedList')}>1. List</button>
        <span className="mx-2 h-5 w-px bg-black/10 dark:bg-white/10 inline-block align-middle" />
        <button type="button" title="Выровнять влево" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('justifyLeft')}>
          ⬅︎
        </button>
        <button type="button" title="По центру" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('justifyCenter')}>
          ↔︎
        </button>
        <button type="button" title="Выровнять вправо" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('justifyRight')}>
          ➡︎
        </button>
        <button type="button" title="По ширине" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('justifyFull')}>
          ⤧⤨
        </button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => { const url = prompt('Ссылка URL:'); if (url) apply('createLink', url); }}>Link</button>
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('removeFormat')}>Clear</button>
      </div>
      <div
        ref={ref}
        className="min-h-[120px] w-full rounded-b-md bg-transparent p-2 outline-none prose dark:prose-invert max-w-none rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        onPaste={(e) => {
          e.preventDefault();
          const html = (e.clipboardData && e.clipboardData.getData('text/html')) || '';
          const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
          if (html) {
            const clean = sanitizeHtml(html);
            document.execCommand('insertHTML', false, clean);
          } else if (text) {
            document.execCommand('insertText', false, text);
          }
        }}
        onKeyDown={(e) => {
          const isMod = e.ctrlKey || e.metaKey;
          if (!isMod) return;
          const key = e.key.toLowerCase();
          if (key === 'y' || (key === 'z' && e.shiftKey)) {
            e.preventDefault();
            document.execCommand('redo');
          } else if (key === 'z') {
            e.preventDefault();
            document.execCommand('undo');
          }
        }}
        onFocus={() => {
          setFocused(true);
          saveSelection();
        }}
        onBlur={() => setFocused(false)}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}

function InlineEditable({
  value,
  placeholder,
  onChange,
  onCommit,
  className,
  multiline,
}: {
  value: string;
  placeholder: string;
  onChange: (text: string) => void;
  onCommit: () => void;
  className?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLDivElement).blur();
    }
  };
  const isEmpty = !value || !value.trim();

  // Keep DOM text in sync only when not focused, to preserve caret position
  useEffect(() => {
    if (focused) return;
    const el = ref.current;
    if (!el) return;
    const next = value || '';
    if (el.textContent !== next) el.textContent = next;
  }, [value, focused]);

  return (
    <div className={`relative ${className || ''}`}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`cursor-text rounded-sm px-1 -mx-1 ring-1 ring-transparent transition outline-none hover:ring-sky-300/60 focus:ring-sky-500/70`}
        onPaste={(e) => {
          e.preventDefault();
          const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
          document.execCommand('insertText', false, text);
        }}
        onFocus={() => {
          setFocused(true);
          // if empty, ensure clean start
          if (ref.current && (!ref.current.textContent || !ref.current.textContent.trim())) {
            ref.current.textContent = '';
          }
        }}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerText)}
        onBlur={() => { setFocused(false); onCommit(); }}
        onKeyDown={handleKeyDown}
      />
      {!focused && isEmpty && (
        <span className="pointer-events-none absolute left-0 top-0 px-1 -mx-1 text-gray-400 italic select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
}

function Collapsible({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState<string>('0px');
  const [fullyOpen, setFullyOpen] = useState<boolean>(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isOpen) {
      setFullyOpen(false);
      // Start from 0, then expand to measured height
      setMaxH('0px');
      const r1 = requestAnimationFrame(() => {
        const h = el.scrollHeight;
        setMaxH(h + 'px');
      });
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === 'max-height') setFullyOpen(true);
      };
      el.addEventListener('transitionend', onEnd as any);
      return () => {
        cancelAnimationFrame(r1);
        el.removeEventListener('transitionend', onEnd as any);
      };
    } else {
      // Collapse: fix current height, then animate to 0
      setFullyOpen(false);
      const h = el.scrollHeight;
      setMaxH(h + 'px');
      const r2 = requestAnimationFrame(() => setMaxH('0px'));
      return () => cancelAnimationFrame(r2);
    }
  }, [isOpen]);

  return (
    <div
      ref={ref as any}
      style={{
        maxHeight: fullyOpen ? 'none' : maxH,
        overflow: 'hidden',
        transition: 'max-height 280ms ease-in-out',
        willChange: 'max-height',
      }}
    >
      {children}
    </div>
  );
}

export default function AdminChapterPage() {
  const { id } = useParams();
	const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [loadingLessons, setLoadingLessons] = useState<boolean>(true);
	const [open, setOpen] = useState<Record<string, boolean>>({});
	const [draftMeta, setDraftMeta] = useState<Record<string, { orderIndex: number; title: string; description: string }>>({});
  const [draftBlocks, setDraftBlocks] = useState<Record<string, Block[]>>({});
  const draftBlocksRef = useRef<Record<string, Block[]>>({});
  useEffect(() => { draftBlocksRef.current = draftBlocks; }, [draftBlocks]);
	const [hasTest, setHasTest] = useState<boolean>(false);
	const { push } = useToast();
	const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
	const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);
	const [dragOverPosition, setDragOverPosition] = useState<'before'|'after'|null>(null);
	const prevOpenRef = useRef<Record<string, boolean> | null>(null);
	const [isOrderingLessons, setIsOrderingLessons] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<Record<string, 'content' | 'test'>>({});
  const [testLoaded, setTestLoaded] = useState<Record<string, boolean>>({});
  const [testConfig, setTestConfig] = useState<Record<string, { passScore?: number | null; timeLimitSec?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean; isPublished?: boolean }>>({});
	const [lessonSettingsOpen, setLessonSettingsOpen] = useState<Record<string, boolean>>({});
	const [lessonSettingsDirty, setLessonSettingsDirty] = useState<Record<string, boolean>>({});
  const [lessonEditorData, setLessonEditorData] = useState<Record<string, TestStructure | null>>({});
  const [lessonEditorDirty, setLessonEditorDirty] = useState<Record<string, boolean>>({});
  // История изменений для контента уроков (Ctrl+Z / Ctrl+Y)
  const historyRef = useRef<Record<string, { stack: Block[][]; index: number }>>({});
  const deepCloneBlocks = (arr: Block[]) => arr.map((b) => ({ ...b }));
  const initHistoryFor = (lessonId: string, blocks: Block[]) => {
    historyRef.current[lessonId] = { stack: [deepCloneBlocks(blocks)], index: 0 };
  };
  const pushHistoryFor = (lessonId: string, blocks: Block[]) => {
    const entry = historyRef.current[lessonId] || { stack: [], index: -1 };
    // отбрасываем «вперёд», если были undo
    entry.stack = entry.stack.slice(0, entry.index + 1);
    entry.stack.push(deepCloneBlocks(blocks));
    if (entry.stack.length > 50) entry.stack = entry.stack.slice(entry.stack.length - 50);
    entry.index = entry.stack.length - 1;
    historyRef.current[lessonId] = entry;
  };
  const undoFor = (lessonId: string) => {
    const entry = historyRef.current[lessonId];
    if (!entry || entry.index <= 0) return;
    entry.index -= 1;
    const state = entry.stack[entry.index];
    setDraftBlocks((prev) => ({ ...prev, [lessonId]: deepCloneBlocks(state) }));
    scheduleAutoSave(lessonId);
  };
  const redoFor = (lessonId: string) => {
    const entry = historyRef.current[lessonId];
    if (!entry || entry.index >= entry.stack.length - 1) return;
    entry.index += 1;
    const state = entry.stack[entry.index];
    setDraftBlocks((prev) => ({ ...prev, [lessonId]: deepCloneBlocks(state) }));
    scheduleAutoSave(lessonId);
  };
  const handleHotkeysFor = (lessonId: string) => (e: React.KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;
    const target = e.target as HTMLElement;
    const tag = target?.tagName;
    const isEditable = target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (isEditable) return; // пусть нативный undo/redo работает в полях ввода
    const key = e.key.toLowerCase();
    if (key === 'z') { e.preventDefault(); undoFor(lessonId); }
    if (key === 'y') { e.preventDefault(); redoFor(lessonId); }
  };
  // legacy inline questions state kept temporarily for backward compatibility; not used in new UI
  // const [testQuestions, setTestQuestions] = useState<Record<string, { type: 'SINGLE'|'MULTI'|'BOOLEAN'; text: string; sectionId?: string | null; points?: number; booleanCorrect?: boolean; answers: { text: string; isCorrect: boolean }[] }[]>>({});
  const autoSaveTimersRef = useRef<Record<string, any>>({});
  const [savingCount, setSavingCount] = useState<number>(0);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const formatSaved = (ts: number | null) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return sameDay ? d.toLocaleTimeString() : d.toLocaleDateString();
  };

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/chapters/${id}`);
        setChapter(data);
        if (data?.courseId) {
          try {
            const c = await api.get(`/courses/admin/by-id/${data.courseId}`);
            setCourseTitle(c.data?.title || '');
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

	useEffect(() => {
		const loadLessons = async () => {
			if (!id) return;
			setLoadingLessons(true);
			try {
				const { data } = await api.get(`/chapters/${id}/lessons`);
				const arr: Lesson[] = Array.isArray(data) ? data : [];
				setLessons(arr);
				// инициализируем черновики для открытых уроков
				setDraftMeta((prev) => {
					const next = { ...prev };
					for (const l of arr) {
						next[l.id] = next[l.id] || { orderIndex: l.orderIndex, title: l.title, description: l.description ?? '' };
					}
					return next;
				});
				setDraftBlocks((prev) => {
					const next = { ...prev };
					for (const l of arr) {
						next[l.id] = next[l.id] || (Array.isArray(l.contents) ? l.contents.map((b) => ({ ...b })) : []);
					}
					return next;
				});
          // Инициализируем историю значениями с бэкенда
          for (const l of arr) {
            initHistoryFor(l.id, Array.isArray(l.contents) ? l.contents : []);
          }
			} finally {
				setLoadingLessons(false);
			}
		};
		void loadLessons();
	}, [id]);

	useEffect(() => {
		const loadTestMeta = async () => {
			if (!id) return;
			try {
				const { data } = await api.get(`/chapters/${id}/test`);
				setHasTest(!!data?.id);
			} catch {
				setHasTest(false);
			}
		};
		void loadTestMeta();
	}, [id]);

	const reloadLessons = async () => {
		if (!id) return;
		const { data } = await api.get(`/chapters/${id}/lessons`);
		const arr: Lesson[] = Array.isArray(data) ? data : [];
		setLessons(arr);
		setDraftMeta((prev) => {
			const next = { ...prev };
			for (const l of arr) {
				next[l.id] = { orderIndex: l.orderIndex, title: l.title, description: l.description ?? '' };
			}
			return next;
		});
		setDraftBlocks((prev) => {
			const next = { ...prev };
			for (const l of arr) {
				next[l.id] = (Array.isArray(l.contents) ? l.contents.map((b) => ({ ...b })) : []);
			}
			return next;
		});
    // Сбрасываем историю к актуальным данным
    for (const l of arr) {
      initHistoryFor(l.id, Array.isArray(l.contents) ? l.contents : []);
    }
		return arr;
	};

	const toggleOpen = (lessonId: string) => setOpen((o) => ({ ...o, [lessonId]: !o[lessonId] }));

	const createLesson = async () => {
		if (!id) return;
		const nextOrder = (lessons[lessons.length - 1]?.orderIndex ?? 0) + 1;
		await api.post(`/chapters/${id}/lessons`, { orderIndex: nextOrder, title: 'Новый урок', description: '' });
		const arr = await reloadLessons();
		const created = (arr || []).find((l) => l.orderIndex === nextOrder);
		if (created) setOpen((o) => ({ ...o, [created.id]: true }));
		push({ type: 'success', title: 'Урок создан' });
	};

	const saveMeta = async (lessonId: string) => {
		const meta = draftMeta[lessonId];
		if (!meta || !id) return;
		await api.patch(`/chapters/${id}/lessons/${lessonId}`, {
			title: meta.title,
			description: meta.description ?? null,
		});
		push({ type: 'success', title: 'Урок обновлён' });
		await reloadLessons();
	};

	const removeLesson = async (lessonId: string) => {
		if (!id) return;
		await api.delete(`/chapters/${id}/lessons/${lessonId}`);
		push({ type: 'success', title: 'Урок удалён' });
		await reloadLessons();
	};

  const scheduleAutoSave = (lessonId: string) => {
    const timers = autoSaveTimersRef.current;
    if (timers[lessonId]) clearTimeout(timers[lessonId]);
    timers[lessonId] = setTimeout(() => {
      void saveBlocks(lessonId);
    }, 800);
  };

  const setBlocksFor = (lessonId: string, updater: (arr: Block[]) => Block[]) => {
    setDraftBlocks((prev) => {
      const prevBlocks = prev[lessonId] || [];
      const nextBlocks = updater(prevBlocks);
      pushHistoryFor(lessonId, nextBlocks);
      return { ...prev, [lessonId]: nextBlocks };
    });
    scheduleAutoSave(lessonId);
  };

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');

  const saveBlocks = async (lessonId: string) => {
    const latest = draftBlocksRef.current?.[lessonId] || [];
    // Нормализуем индексы, чтобы гарантировать последовательность
    const blocks = latest.map(({ id: _ignore, ...b }, idx) => ({ ...b, sortIndex: (b.sortIndex && b.sortIndex > 0) ? b.sortIndex : idx + 1 }));
		const chapterId = id!;
    setSavingCount((c) => c + 1);
    try {
      await api.post(`/chapters/${chapterId}/lessons/${lessonId}/contents`, { blocks });
      setLastSavedAt(Date.now());
      await reloadLessons();
    } finally {
      setSavingCount((c) => Math.max(0, c - 1));
    }
	};

	const handleLessonDropReorder = async (sourceLessonId: string | null | undefined, dropTargetLessonId: string, position?: 'before'|'after'|null) => {
		if (!id) return;
		const srcId = sourceLessonId || draggingLessonId;
		if (!srcId || srcId === dropTargetLessonId) return;
		const ordered = lessons.slice().sort((a, b) => a.orderIndex - b.orderIndex);
		const fromIdx = ordered.findIndex((x) => x.id === srcId);
		let toIdx = ordered.findIndex((x) => x.id === dropTargetLessonId);
		if (fromIdx === -1 || toIdx === -1) return;
		// if dropping after and moving downward, shift index by +1
		if (position === 'after') {
			toIdx = toIdx + (fromIdx < toIdx ? 0 : 1);
		}
		const next = [...ordered];
		const [moved] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, moved);
		const optimistic = next.map((lesson, index) => ({ ...lesson, orderIndex: index + 1 }));
		setLessons(optimistic);
		setIsOrderingLessons(true);
		try {
			// Two-phase update to avoid unique constraint conflicts on (chapterId, orderIndex)
			const maxOrder = Math.max(0, ...ordered.map((l) => l.orderIndex));
			const tempBase = maxOrder + 1000;
			// Phase A: move all affected lessons to temp unique indexes
			await Promise.all(
				optimistic.map((lesson, idx) => api.patch(`/chapters/${id}/lessons/${lesson.id}`, { orderIndex: tempBase + idx + 1 }))
			);
			// Phase B: set final desired indexes
			await Promise.all(
				optimistic.map((lesson) => api.patch(`/chapters/${id}/lessons/${lesson.id}`, { orderIndex: lesson.orderIndex }))
			);
			await reloadLessons();
		} finally {
			setIsOrderingLessons(false);
		}
	};

	const lessonsSorted = useMemo(() => lessons.slice().sort((a, b) => a.orderIndex - b.orderIndex), [lessons]);

	const ensureLessonTestLoaded = async (lessonId: string) => {
		if (testLoaded[lessonId]) return;
		try {
			const { data } = await api.get(`/lessons/${lessonId}/test`);
			if (data) {
				setTestConfig((prev) => ({
					...prev,
					[lessonId]: {
						passScore: data.passScore ?? 70,
						timeLimitSec: data.timeLimitSec ?? null,
						questionCount: data.questionCount ?? null,
						shuffleQuestions: data.shuffleQuestions ?? true,
						shuffleAnswers: data.shuffleAnswers ?? true,
						isPublished: !!data.isPublished,
					},
				}));
				// Load questions for embedded editor
				if (data.id) {
					const qs = await api.get(`/tests/${data.id}/questions`).then((r) => r.data).catch(() => []);
					const lessonTitle = (lessons.find((x) => x.id === lessonId)?.title) || 'Тест урока';
					const blocks = [
						{
							id: `b-${Date.now()}`,
							title: 'Блок 1',
							type: 'single_choice',
							questions: (qs || []).map((q: any) => ({
								id: q.id,
								text: q.text,
								type: q.type === 'MULTI' ? 'multiple_choice' : q.type === 'BOOLEAN' ? 'true_false' : 'single_choice',
								points: q.points || 1,
								options: (q.answers || []).map((a: any) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
							})),
						},
					];
					setLessonEditorData((m) => ({ ...m, [lessonId]: { metadata: { title: lessonTitle, totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks, evaluation: { criteria: [], gradingScale: [] } } as any }));
				} else {
					const lessonTitle = (lessons.find((x) => x.id === lessonId)?.title) || 'Тест урока';
					setLessonEditorData((m) => ({ ...m, [lessonId]: { metadata: { title: lessonTitle, totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any }));
				}
			} else {
				setTestConfig((prev) => ({
					...prev,
					[lessonId]: { passScore: 70, shuffleQuestions: true, shuffleAnswers: true, timeLimitSec: null, questionCount: null, isPublished: false },
				}));
				const lessonTitle = (lessons.find((x) => x.id === lessonId)?.title) || 'Тест урока';
				setLessonEditorData((m) => ({ ...m, [lessonId]: { metadata: { title: lessonTitle, totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any }));
			}
      // questions are edited in dedicated constructor page now
		} finally {
			setTestLoaded((m) => ({ ...m, [lessonId]: true }));
		}
	};

	const setActiveTabFor = async (lessonId: string, tab: 'content'|'test') => {
		setActiveTab((m) => ({ ...m, [lessonId]: tab }));
		if (tab === 'test') await ensureLessonTestLoaded(lessonId);
	};

  // legacy inline questions editor helpers (not used in new flow)
  // kept for potential future reuse; currently replaced by dedicated constructor page


	const saveTestConfigFor = async (lessonId: string) => {
		const cfg = testConfig[lessonId] || { passScore: 70, shuffleQuestions: true, shuffleAnswers: true };
		// 1) Сохраняем/создаём тест с конфигом
		const saved = await api.post(`/lessons/${lessonId}/test`, cfg).then((r) => r.data);
		const testId = saved?.id;
		// 2) Если тест включён и есть данные редактора — сохраняем вопросы
		const editor = lessonEditorData[lessonId];
		if ((cfg.isPublished ?? false) && editor && testId) {
			const list = (editor.blocks?.[0]?.questions || []);
			if (list.length > 5) {
				push({ type: 'error', title: 'Не более 5 вопросов', description: 'В тесте урока допускается максимум 5 вопросов.' });
				return;
			}
			try {
				const prev = await api.post(`/tests/${testId}/preview`).then((r) => r.data);
				const existingIds: string[] = (prev?.items || []).map((it: any) => it.questionId).filter(Boolean);
				if (existingIds.length) await Promise.all(existingIds.map((qid) => api.delete(`/questions/${qid}`, { headers: { 'X-Silent-Error': '1' } })));
			} catch {}
			const flat = list.map((q: any) => ({
				type: q.type === 'multiple_choice' ? 'MULTI' : q.type === 'true_false' ? 'BOOLEAN' : 'SINGLE',
				text: q.text,
				points: q.type === 'multiple_choice' ? Math.max(2, q.points || 2) : (q.points || 1),
				answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
			}));
			await api.post(`/tests/${testId}/questions`, { questions: flat });
			setLessonEditorDirty((m) => ({ ...m, [lessonId]: false }));
		}
		setLessonSettingsDirty((m) => ({ ...m, [lessonId]: false }));
		push({ type: 'success', title: 'Тест урока сохранён' });
	};

  // saveQuestionsFor removed in favor of constructor page

  if (loading) return <div>Загрузка...</div>;
  if (!chapter) return <div>Модуль не найден</div>;

  return (
    <div className="space-y-4">
      <Card
				title={
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2 min-w-0">
							<span className="inline-flex h-6 w-6 items-center justify-center rounded bg-sky-600 text-xs text-white shrink-0">{chapter.orderIndex}</span>
							<span className="font-semibold line-clamp-2">{chapter.title}</span>
						</div>
						<div>
							<Button variant="secondary" onClick={() => navigate(`/admin/chapters/${chapter.id}/test`)}>
								{hasTest ? 'Редактировать тест' : 'Создать тест'}
							</Button>
						</div>
					</div>
				}
				actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
              {savingCount > 0 ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-spin"
                  >
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <polyline points="21 3 21 9 15 9" />
                  </svg>
                  <span>Сохраняем…</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Сохранено {formatSaved(lastSavedAt)}</span>
                </>
              ) : null}
            </div>

					</div>
				}
			>
        <div className="space-y-1">
          <div className="text-xs uppercase text-gray-500 dark:text-white/50">Курс</div>
          <div className="text-sm font-medium text-gray-800 dark:text-white/80">{courseTitle || 'Без названия'}</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="text-sm text-gray-700 dark:text-white/80">{chapter.description || 'Описание отсутствует'}</div>
          <div className="text-sm text-gray-600 dark:text-white/70">Проходной балл: {chapter.passScore}</div>
					<div className="text-sm text-gray-600 dark:text-white/70">Уроков: {lessons.length}</div>
        </div>
      </Card>

      <Card title="Уроки модуля">
        <div className="text-sm text-gray-600 dark:text-white/70">Список уроков ниже — каждый в отдельной карточке.</div>
      </Card>

      {loadingLessons ? (
        <div>Загрузка уроков…</div>
      ) : lessonsSorted.length === 0 ? (
        <Card>
          <div className="text-sm text-gray-600 dark:text-white/70">Уроков пока нет.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {lessonsSorted.map((l) => (
            <div key={l.id} className="relative">
            <Card
              onDragOver={(e) => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const pos: 'before'|'after' = y < rect.height / 2 ? 'before' : 'after';
                if (dragOverLessonId !== l.id) setDragOverLessonId(l.id);
                setDragOverPosition(pos);
              }}
              onDragLeave={() => { if (dragOverLessonId === l.id) { setDragOverLessonId(null); setDragOverPosition(null); } }}
              onDragEnd={() => { setDraggingLessonId(null); setDragOverLessonId(null); setDragOverPosition(null); if (prevOpenRef.current) { setOpen(prevOpenRef.current); prevOpenRef.current = null; } }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); let src: string | null | undefined = null; try { src = e.dataTransfer?.getData('text/plain') || draggingLessonId; } catch { src = draggingLessonId; } void handleLessonDropReorder(src, l.id, dragOverPosition); setDragOverLessonId(null); setDragOverPosition(null); }}
              className={`${draggingLessonId === l.id ? 'opacity-60 scale-[0.99]' : ''} ${dragOverLessonId === l.id ? 'ring-2 ring-sky-300 dark:ring-sky-500/40' : ''} transition-transform`}
              title={
                <div className="flex items-center gap-2">
                  <button
                    className="mr-1 rounded p-1 text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing"
                    draggable
                    aria-label="Переместить урок"
                    title="Перетащить для изменения порядка"
                    onDragStart={(e) => {
                      try { if (e.dataTransfer) { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move'; } } catch {}
                      setDraggingLessonId(l.id);
                      setDragOverLessonId(null);
                      prevOpenRef.current = open;
                      setOpen({});
                    }}
                    onDragEnd={() => { setDraggingLessonId(null); if (prevOpenRef.current) { setOpen(prevOpenRef.current); prevOpenRef.current = null; } }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="8" cy="7" r="1.5" />
                      <circle cx="16" cy="7" r="1.5" />
                      <circle cx="8" cy="12" r="1.5" />
                      <circle cx="16" cy="12" r="1.5" />
                      <circle cx="8" cy="17" r="1.5" />
                      <circle cx="16" cy="17" r="1.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleOpen(l.id)}
                    className="rounded p-1 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                    aria-expanded={!!open[l.id]}
                    title={open[l.id] ? 'Свернуть' : 'Развернуть'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={open[l.id] ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} /></svg>
                  </button>
                  <InlineEditable
                    value={draftMeta[l.id]?.title ?? l.title}
                    placeholder="Новый урок — введите заголовок"
                    onChange={(text) => setDraftMeta((prev) => ({ ...prev, [l.id]: { orderIndex: (prev[l.id]?.orderIndex ?? l.orderIndex), title: text, description: (prev[l.id]?.description ?? l.description ?? '') } }))}
                    onCommit={() => saveMeta(l.id)}
                    className="font-semibold text-gray-900 dark:text-white"
                  />
                </div>
              }
              actions={
                <div className="flex items-center gap-1">
                  {isOrderingLessons && draggingLessonId === l.id && (
                    <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-r-transparent" />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Удалить урок"
                    className="h-8 w-8 p-0 rounded-full text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300"
                    onClick={() => removeLesson(l.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </Button>
                </div>
              }
            >
              <Collapsible isOpen={!!open[l.id]}>
                <div className="space-y-6">
                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-700 dark:text-white/70">Описание</div>
                    <InlineEditable
                      value={draftMeta[l.id]?.description ?? (l.description ?? '')}
                      placeholder="Добавьте описание урока"
                      multiline
                      className="min-h-[24px] whitespace-pre-wrap text-gray-700 dark:text-white/80"
                      onChange={(text) => setDraftMeta((prev) => ({ ...prev, [l.id]: { orderIndex: (prev[l.id]?.orderIndex ?? l.orderIndex), title: (prev[l.id]?.title ?? l.title), description: text } }))}
                      onCommit={() => saveMeta(l.id)}
                    />
                  </div>

				  <div className="relative mt-6">
					<div className="relative flex items-end gap-2 pl-2">
					  <button
                        className={`relative rounded-t-xl border border-black/10 px-3 py-1.5 text-xs font-semibold transition-all dark:border-white/10 ${
                          (activeTab[l.id] || 'content') === 'content'
                            ? 'z-20 bg-white dark:bg-slate-800 text-gray-800 dark:text-white border-b-0 translate-y-0 shadow-none'
                            : 'z-0 bg-gray-100 text-gray-700 hover:bg-white dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 backdrop-blur-sm translate-y-[1px] shadow-sm'
                        }`}
						onClick={() => setActiveTabFor(l.id, 'content')}
					  >Контент</button>
					  <button
                        className={`relative rounded-t-xl border border-black/10 px-3 py-1.5 text-xs font-semibold transition-all dark:border-white/10 ${
                          (activeTab[l.id] || 'content') === 'test'
                            ? 'z-20 bg-white dark:bg-slate-800 text-gray-800 dark:text-white border-b-0 translate-y-0 shadow-none'
                            : 'z-0 bg-gray-100 text-gray-700 hover:bg-white dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 backdrop-blur-sm translate-y-[1px] shadow-sm'
                        }`}
						onClick={() => setActiveTabFor(l.id, 'test')}
					  >Тест</button>
					</div>
                    <div
                      className="relative z-10 -mt-[1px] rounded-xl border border-black/10 bg-white pt-5 shadow-sm dark:border-white/10 dark:bg-slate-800 before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-transparent"
                      onKeyDown={handleHotkeysFor(l.id)}
                      tabIndex={0}
                    >
                      {(activeTab[l.id] || 'content') === 'content' ? (
                        <div>
                          <div className="mb-2 text-sm font-medium pl-3 sm:pl-4">Контент урока</div>
                          <div className="space-y-4 transition-all px-3 sm:px-4 py-3">
                            {(draftBlocks[l.id] || []).map((b, idx) => (
                              <Card key={idx}>
                                <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                                  <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-2">
                                    <Select
                                      label="Тип блока"
                                      value={b.blockType}
                                      onChange={(e) => setBlocksFor(l.id, (arr) => arr.map((x, i) => i === idx ? { ...x, blockType: e.target.value as Block['blockType'] } : x))}
                                      options={[
                                        { value: 'TEXT', label: 'Текст' },
                                        { value: 'IMAGE', label: 'Изображение' },
                                        { value: 'VIDEO', label: 'Видео' },
                                        { value: 'FILE', label: 'Файл' },
                                      ]}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <Button size="sm" variant="ghost" title="Вверх" className="h-8 w-8 p-0 rounded-full" onClick={() => setBlocksFor(l.id, (arr) => {
                                      const a = [...arr];
                                      if (idx <= 0) return a;
                                      [a[idx-1], a[idx]] = [a[idx], a[idx-1]];
                                      return a.map((x, i) => ({ ...x, sortIndex: i + 1 }));
                                    })}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="18" x2="12" y2="6" />
                                        <polyline points="6 10 12 4 18 10" />
                                      </svg>
                                    </Button>
                                    <Button size="sm" variant="ghost" title="Вниз" className="h-8 w-8 p-0 rounded-full" onClick={() => setBlocksFor(l.id, (arr) => {
                                      const a = [...arr];
                                      if (idx >= a.length - 1) return a;
                                      [a[idx+1], a[idx]] = [a[idx], a[idx+1]];
                                      return a.map((x, i) => ({ ...x, sortIndex: i + 1 }));
                                    })}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="6" x2="12" y2="18" />
                                        <polyline points="6 14 12 20 18 14" />
                                      </svg>
                                    </Button>
                                    <Button size="sm" variant="ghost" title="Удалить блок" className="h-8 w-8 p-0 rounded-full text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300" onClick={() => setBlocksFor(l.id, (arr) => arr.filter((_, i) => i !== idx).map((x, i) => ({ ...x, sortIndex: i + 1 })))}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                    </Button>
                                  </div>
                                </div>

                                {b.blockType === 'TEXT' && (
                                  <RichTextEditor value={b.textHtml ?? ''} onChange={(html) => setBlocksFor(l.id, (arr) => arr.map((x, i) => i === idx ? { ...x, textHtml: html } : x))} />
                                )}
                                {b.blockType !== 'TEXT' && (
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                      <div className="text-sm text-white/70">Медиа-файл</div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="secondary"
                                          disabled={uploadingKey !== null}
                                          onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.onchange = async () => {
                                            const f = (input.files || [])[0];
                                            if (!f) return;
                                            const uKey = `${l.id}-${idx}`;
                                            setUploadingKey(uKey);
                                            setUploadProgress(0);
                                            setUploadFileName(f.name);
                                            try {
                                              const key = await uploadFileWithProgress(f, setUploadProgress);
                                              setBlocksFor(l.id, (arr) => arr.map((x, i) => i === idx ? { ...x, mediaKey: key } : x));
                                              push({ type: 'success', title: 'Файл загружен' });
                                            } catch {
                                              push({ type: 'error', title: 'Ошибка загрузки файла' });
                                            } finally {
                                              setUploadingKey(null);
                                            }
                                          };
                                          input.click();
                                        }}
                                      >{uploadingKey === `${l.id}-${idx}` ? 'Загрузка...' : 'Выберите файл'}</Button>
                                      {uploadingKey === `${l.id}-${idx}` && <UploadProgress percent={uploadProgress} fileName={uploadFileName} />}
                                      {b.mediaKey && uploadingKey !== `${l.id}-${idx}` && (<span className="truncate text-sm text-gray-600 dark:text-white/70">{b.mediaKey}</span>)}
                                      </div>
                                      {b.blockType === 'VIDEO' && b.mediaKey && (
                                        <div className="mt-3">
                                          <div className="text-sm text-gray-600 dark:text-white/70">Предпросмотр видео</div>
                                          <video className="mt-1 w-full h-auto rounded" controls src={toMediaUrl(b.mediaKey)} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {b.blockType === 'IMAGE' && b.mediaKey && (
                                  <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm text-white/80">
                                    <div className="mb-2">Предпросмотр изображения</div>
                                    <img className="max-h-80 w-auto rounded" src={toMediaUrl(b.mediaKey)} />
                                  </div>
                                )}
                              </Card>
                            ))}
                            <button
                              type="button"
                              onClick={() => setBlocksFor(l.id, (arr) => {
                                const nextIndex = (arr.length ? Math.max(0, ...arr.map(x => x.sortIndex || 0)) : 0) + 1;
                                return [...arr, { blockType: 'TEXT', textHtml: '', mediaKey: null, sortIndex: nextIndex }];
                              })}
                              className="w-full rounded-lg border-2 border-dashed border-black/20 py-5 text-sm font-medium text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/10"
                            >
                              <span className="inline-flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Добавить блок
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 px-3 sm:px-4 py-3">
                          <Card
                            title={<div className="flex items-center gap-3">Настройки теста {lessonSettingsDirty[l.id] && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Есть несохранённые данные</span>}</div>}
                            actions={
                              <button
                                onClick={() => setLessonSettingsOpen((m) => ({ ...m, [l.id]: !(m[l.id] ?? true) }))}
                                className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                                aria-expanded={lessonSettingsOpen[l.id] ?? true}
                              >
                                {(lessonSettingsOpen[l.id] ?? true) ? 'Свернуть' : 'Развернуть'}
                              </button>
                            }
                          >
                            {(lessonSettingsOpen[l.id] ?? true) && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 items-center">
                                <div className="text-sm text-gray-700 dark:text-gray-200">Тест урока включён</div>
                                <div className="justify-self-end">
                                  <Toggle label="" checked={!!(testConfig[l.id]?.isPublished)} onChange={(checked) => { setTestConfig((m) => ({ ...m, [l.id]: { ...(m[l.id] || {}), isPublished: checked } })); setLessonSettingsDirty((m) => ({ ...m, [l.id]: true })); }} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 items-center">
                                <div className="text-sm text-gray-700 dark:text-gray-200">Проходной процентный балл</div>
                                <div className="justify-self-end">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={(testConfig[l.id]?.passScore ?? 70) as any}
                                      onChange={(e) => {
                                        const raw = e.target.value === '' ? '' : Number(e.target.value);
                                        const val = raw === '' ? 0 : Math.max(0, Math.min(100, Number(raw)));
                                        setTestConfig((m) => ({ ...m, [l.id]: { ...(m[l.id] || {}), passScore: val } }));
                                        setLessonSettingsDirty((m) => ({ ...m, [l.id]: true }));
                                      }}
                                      className="w-14 pr-8 text-right"
                                      disabled={!(testConfig[l.id]?.isPublished)}
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 items-center">
                                <div className="text-sm text-gray-700 dark:text-gray-200">Лимит времени (мин)</div>
                                <div className="justify-self-end">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={99}
                                      value={(Math.round(((testConfig[l.id]?.timeLimitSec ?? 1200) as any) / 60)) as any}
                                      onChange={(e) => {
                                        const raw = e.target.value === '' ? '' : Number(e.target.value);
                                        const minutes = raw === '' ? 1 : Math.max(1, Math.min(99, Number(raw)));
                                        setTestConfig((m) => ({ ...m, [l.id]: { ...(m[l.id] || {}), timeLimitSec: (minutes as number) * 60 } }));
                                        setLessonSettingsDirty((m) => ({ ...m, [l.id]: true }));
                                      }}
                                      className="w-14 pr-8 text-right"
                                      disabled={!(testConfig[l.id]?.isPublished)}
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">мин</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 items-center">
                                <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать вопросы</div>
                                <div className="justify-self-end">
                                  <Toggle label="" checked={!!(testConfig[l.id]?.shuffleQuestions ?? true)} onChange={(checked) => { setTestConfig((m) => ({ ...m, [l.id]: { ...(m[l.id] || {}), shuffleQuestions: checked } })); setLessonSettingsDirty((m) => ({ ...m, [l.id]: true })); }} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 items-center">
                                <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать ответы</div>
                                <div className="justify-self-end">
                                  <Toggle label="" checked={!!(testConfig[l.id]?.shuffleAnswers ?? true)} onChange={(checked) => { setTestConfig((m) => ({ ...m, [l.id]: { ...(m[l.id] || {}), shuffleAnswers: checked } })); setLessonSettingsDirty((m) => ({ ...m, [l.id]: true })); }} />
                                </div>
                              </div>
                            </div>
                            )}
                            <div className="mt-4 flex justify-end">
                              <div className="flex gap-2">
                                <Button variant="secondary" onClick={async () => {
                                  const test = await api.get(`/lessons/${l.id}/test`).then((r) => r.data).catch(() => null);
                                  const testId = test?.id || (await api.post(`/lessons/${l.id}/test`, testConfig[l.id] || {}).then((r) => r.data?.id));
                                  if (!testId) return;
                                  window.open(`/preview/tests/${testId}?lessonId=${l.id}`, '_blank');
                                }}>Предпросмотр</Button>
                                <Button onClick={() => saveTestConfigFor(l.id)} disabled={!lessonSettingsDirty[l.id] && !lessonEditorDirty[l.id]} title={!lessonSettingsDirty[l.id] && !lessonEditorDirty[l.id] ? 'Нет несохранённых изменений' : undefined}>Сохранить</Button>
                              </div>
                            </div>
                          </Card>
                          {!(testConfig[l.id]?.isPublished) ? (
                            <Card>
                              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800">
                                Тест урока выключен. Включите «Тест урока включён» и сохраните настройки, чтобы редактировать вопросы.
                              </div>
                            </Card>
                          ) : (
                            <Card title="Конструктор вопросов">
                              {lessonEditorData[l.id] ? (
                                <TestEditor
                                  initialData={lessonEditorData[l.id] as any}
                                  onChange={(payload: TestStructure, isDirty: boolean) => {
                                    // Ограничение: максимум 5 вопросов
                                    const proposed = (payload?.blocks?.[0]?.questions || []);
                                    if (proposed.length > 5) {
                                      // Обрежем лишние локально и покажем тост
                                      const trimmed = { ...payload, blocks: [{ ...(payload.blocks?.[0] || {}), questions: proposed.slice(0, 5) }] } as TestStructure;
                                      setLessonEditorData((m) => ({ ...m, [l.id]: trimmed }));
                                      setLessonEditorDirty((m) => ({ ...m, [l.id]: true }));
                                      push({ type: 'error', title: 'Не более 5 вопросов', description: 'В тесте урока допускается максимум 5 вопросов.' });
                                      return;
                                    }
                                    setLessonEditorData((m) => ({ ...m, [l.id]: payload }));
                                    setLessonEditorDirty((m) => ({ ...m, [l.id]: !!isDirty }));
                                  }}
                                  onSave={async (payload: TestStructure) => {
                                    const cfg = testConfig[l.id] || { passScore: 70, shuffleQuestions: true, shuffleAnswers: true };
                                    const saved = await api.post(`/lessons/${l.id}/test`, cfg).then((r) => r.data);
                                    const testId = saved?.id;
                                    const list = (payload.blocks?.[0]?.questions || []);
                                    if (list.length > 5) {
                                      push({ type: 'error', title: 'Не более 5 вопросов', description: 'В тесте урока допускается максимум 5 вопросов.' });
                                      return;
                                    }
                                    try {
                                      const prev = await api.post(`/tests/${testId}/preview`).then((r) => r.data);
                                      const existingIds: string[] = (prev?.items || []).map((it: any) => it.questionId).filter(Boolean);
                                      if (existingIds.length) await Promise.all(existingIds.map((qid) => api.delete(`/questions/${qid}`, { headers: { 'X-Silent-Error': '1' } })));
                                    } catch {}
                                    const flat = list.map((q: any) => ({
                                      type: q.type === 'multiple_choice' ? 'MULTI' : q.type === 'true_false' ? 'BOOLEAN' : 'SINGLE',
                                      text: q.text,
                                      points: q.type === 'multiple_choice' ? Math.max(2, q.points || 2) : (q.points || 1),
                                      answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
                                    }));
                                    await api.post(`/tests/${testId}/questions`, { questions: flat });
                                    setLessonEditorData((m) => ({ ...m, [l.id]: payload as any }));
                                    setLessonEditorDirty((m) => ({ ...m, [l.id]: false }));
                                    push({ type: 'success', title: 'Тест урока сохранён' });
                                  }}
                                />
                              ) : (
                                <div className="text-sm text-gray-600 dark:text-white/70">Загрузка редактора…</div>
                              )}
                              <div className="mt-3 flex justify-end">
                                <Button onClick={() => saveTestConfigFor(l.id)} disabled={!lessonEditorDirty[l.id] && !(testConfig[l.id]?.isPublished)} title={!lessonEditorDirty[l.id] ? 'Нет несохранённых изменений' : undefined}>Сохранить</Button>
                              </div>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Collapsible>
        </Card>
            </div>
          ))}
      </div>
      )}

      {/* Кнопка добавления урока внизу списка */}
      <div className="mt-3">
        <button
          type="button"
          onClick={createLesson}
          className="w-full rounded-lg border-2 border-dashed border-black/20 py-5 text-sm font-medium text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/10"
        >
          <span className="inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Добавить урок
          </span>
        </button>
      </div>
    </div>
  );
}


