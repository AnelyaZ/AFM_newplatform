import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatBar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Ты — умный AI-помощник учебной платформы АФМ (Агентство по регулированию и развитию финансового рынка Казахстана). 
Ты помогаешь студентам:
- Объяснять сложные юридические и финансовые термины простым языком
- Генерировать тестовые вопросы по темам обучения
- Разбирать практические кейсы по финансовому регулированию
- Отвечать на вопросы по материалам курсов

Отвечай на русском языке. Будь точным, полезным и дружелюбным.
Если тебя просят сгенерировать тест — создай 3-5 вопросов с вариантами ответов (A, B, C, D) и укажи правильный ответ.`,
          messages: newMessages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Извините, произошла ошибка.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Ошибка подключения. Попробуйте снова.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    '📝 Создай тест по этой теме',
    '💡 Объясни этот термин',
    '📋 Разбери практический кейс',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-lg shadow-sky-500/30 hover:scale-105 transition-transform"
        aria-label="Открыть AI-помощника"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-44 right-4 z-50 md:bottom-24 md:right-6 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '480px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3 bg-gradient-to-r from-sky-500 to-indigo-500">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">AI-помощник АФМ</div>
              <div className="text-xs text-white/70">Задайте любой вопрос</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center pt-2">Чем могу помочь? 👋</p>
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); inputRef.current?.focus(); }}
                    className="w-full text-left rounded-xl border border-black/10 px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 hover:border-sky-200 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-tr from-sky-500 to-indigo-500 text-white rounded-br-sm'
                    : 'bg-white border border-black/10 text-gray-800 rounded-bl-sm shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-black/10 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/10 dark:border-white/10 p-3 flex gap-2 bg-white/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Напишите сообщение..."
              className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              style={{ maxHeight: '100px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white disabled:opacity-40 hover:scale-105 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
