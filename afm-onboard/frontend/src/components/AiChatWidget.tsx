import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DISABLED_ROUTES = ['/test', '/attempt', '/situation-task'];

export default function AiChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isDisabled = DISABLED_ROUTES.some((r) => location.pathname.includes(r));

  useEffect(() => {
    if (isDisabled) setOpen(false);
  }, [isDisabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (isDisabled) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { messages: next });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      const errText = e?.response?.data?.message || 'Ошибка. Попробуйте позже.';
      setMessages([...next, { role: 'assistant', content: errText }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 shadow-lg hover:bg-sky-500 transition-colors"
          title="Спросить ассистента"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-80 sm:w-96 flex-col rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl" style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-sky-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">ИИ-ассистент АФМ</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                className="text-xs text-white/60 hover:text-white"
                title="Очистить чат"
              >
                Очистить
              </button>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-xs text-white/40 mt-8 px-4">
                Задайте вопрос об обучении, комплаенс-процедурах или ПОД/ФТ на русском языке.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-sky-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-white/90 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm text-white/50">
                  <span className="animate-pulse">Печатает…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <textarea
                className="flex-1 resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Задайте вопрос…"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 self-end items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-[10px] text-white/25 text-center">Enter — отправить · Shift+Enter — новая строка</div>
          </div>
        </div>
      )}
    </>
  );
}
