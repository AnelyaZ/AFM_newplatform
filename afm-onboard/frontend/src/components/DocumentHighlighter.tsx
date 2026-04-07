import { useEffect, useRef, useState } from 'react';

interface Highlight {
  id: string;
  text: string;
  note: string;
  color: string;
  timestamp: number;
}

interface Props {
  lessonId: string;
  html: string;
}

const COLORS = [
  { id: 'yellow', bg: 'bg-yellow-200 dark:bg-yellow-400/40', hex: '#fef08a' },
  { id: 'green',  bg: 'bg-green-200 dark:bg-green-400/40',  hex: '#bbf7d0' },
  { id: 'blue',   bg: 'bg-blue-200 dark:bg-blue-400/40',    hex: '#bfdbfe' },
  { id: 'pink',   bg: 'bg-pink-200 dark:bg-pink-400/40',    hex: '#fbcfe8' },
];

export default function DocumentHighlighter({ lessonId, html }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [popup, setPopup] = useState<{ x: number; y: number; text: string } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const storageKey = `highlights_${lessonId}`;

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setHighlights(JSON.parse(saved));
    } catch {}
  }, [lessonId]);

  // Save to localStorage
  const save = (list: Highlight[]) => {
    setHighlights(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
  };

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const text = selection.toString().trim();
    if (!text || text.length < 3) return;

    // Make sure selection is inside our content
    const range = selection.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current!.getBoundingClientRect();

    setPopup({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text,
    });
    setNoteInput('');
  };

  const addHighlight = () => {
    if (!popup) return;
    const newH: Highlight = {
      id: Date.now().toString(),
      text: popup.text,
      note: noteInput.trim(),
      color: activeColor.hex,
      timestamp: Date.now(),
    };
    save([...highlights, newH]);
    setPopup(null);
    setNoteInput('');
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = (id: string) => {
    save(highlights.filter((h) => h.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateNote = (id: string, note: string) => {
    save(highlights.map((h) => (h.id === id ? { ...h, note } : h)));
  };

  // Render HTML with highlights applied
  const getHighlightedHtml = () => {
    let result = html;
    highlights.forEach((h) => {
      const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'g');
      result = result.replace(
        regex,
        `<mark style="background:${h.color};border-radius:3px;padding:1px 2px;cursor:pointer;" data-hid="${h.id}" title="${h.note || 'Нажмите для заметки'}">$1</mark>`
      );
    });
    return result;
  };

  // Handle click on existing highlight
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const hid = target.getAttribute('data-hid');
    if (hid) {
      setEditingId(hid === editingId ? null : hid);
      setPanelOpen(true);
    }
  };

  return (
    <div className="relative">

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-white/50">Выделите текст для заметки:</span>
        {COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${activeColor.id === c.id ? 'scale-125 border-gray-600 dark:border-white' : 'border-transparent'}`}
            style={{ background: c.hex }}
            title={c.id}
          />
        ))}
        <div className="ml-auto flex items-center gap-2">
          {highlights.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1 text-xs text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Заметки ({highlights.length})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div
          ref={contentRef}
          className="prose dark:prose-invert max-w-none select-text"
          onMouseUp={handleMouseUp}
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }}
        />

        {/* Selection popup */}
        {popup && (
          <div
            className="absolute z-50 glass rounded-xl shadow-xl border border-black/10 dark:border-white/10 p-3 w-64"
            style={{ left: `${popup.x}px`, top: `${popup.y}px`, transform: 'translate(-50%, -100%)' }}
          >
            <div className="text-xs text-gray-500 dark:text-white/50 mb-2 truncate">
              «{popup.text.slice(0, 40)}{popup.text.length > 40 ? '...' : ''}»
            </div>
            <textarea
              autoFocus
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Добавьте заметку (необязательно)..."
              className="w-full resize-none rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 px-2 py-1.5 text-xs text-gray-800 dark:text-white outline-none focus:border-sky-400 mb-2"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={addHighlight}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white"
                style={{ background: activeColor.hex, color: '#374151' }}
              >
                Выделить
              </button>
              <button
                onClick={() => { setPopup(null); window.getSelection()?.removeAllRanges(); }}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes Panel */}
      {panelOpen && highlights.length > 0 && (
        <div className="mt-6 glass rounded-2xl p-4 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Мои заметки</span>
            </div>
            <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {highlights.map((h) => (
              <div
                key={h.id}
                className={`rounded-xl p-3 border transition-all ${editingId === h.id ? 'border-sky-400' : 'border-black/5 dark:border-white/5'}`}
                style={{ background: h.color + '33' }}
              >
                <div className="text-xs font-medium text-gray-700 dark:text-white/80 mb-1 line-clamp-2">
                  «{h.text}»
                </div>
                {editingId === h.id ? (
                  <textarea
                    value={h.note}
                    onChange={(e) => updateNote(h.id, e.target.value)}
                    placeholder="Напишите заметку..."
                    className="w-full resize-none rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 px-2 py-1.5 text-xs text-gray-800 dark:text-white outline-none focus:border-sky-400"
                    rows={2}
                    autoFocus
                  />
                ) : (
                  <div className="text-xs text-gray-500 dark:text-white/50 italic">
                    {h.note || 'Нет заметки — нажмите чтобы добавить'}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(h.timestamp).toLocaleDateString('ru-RU')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(editingId === h.id ? null : h.id)}
                      className="text-xs text-sky-500 hover:text-sky-700"
                    >
                      {editingId === h.id ? 'Сохранить' : 'Изменить'}
                    </button>
                    <button
                      onClick={() => deleteHighlight(h.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
