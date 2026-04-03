import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toaster';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Card from '../components/ui/Card';
import { useAuthStore } from '../store/auth';

type TestMeta = { id: string; timeLimitSec?: number | null; passScore?: number | null };
type Item = {
  questionId: string;
  text: string;
  type: 'SINGLE' | 'MULTI' | 'BOOLEAN';
  options: { answerId: string; text: string }[];
};

export default function TestRunnerPage() {
  const { chapterId, lessonId, courseId, testId } = useParams();
  const [searchParams] = useSearchParams();
  const [test, setTest] = useState<TestMeta | null>(null);
  // currentTestId reserved for future enhancements (e.g., deep-links)
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const { push } = useToast();
  const navigate = useNavigate();
  const isPreview = useMemo(() => searchParams.get('preview') === '1' || window.location.pathname.includes('/preview'), [searchParams]);
  const [completed, setCompleted] = useState(false);
  type Verdict = 'CREDIT' | 'NO_CREDIT';
  const [result, setResult] = useState<null | { score: number; status: Verdict; feedback?: any[]; details?: any[]; totalPoints?: number; percent?: number; timeSpentSec?: number }>(null);
  const [questionMeta, setQuestionMeta] = useState<Record<string, { points: number; correctIds: Set<string>; optionById: Record<string, string>; text: string; type: Item['type'] }>>({});
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Determine test id based on params
        let tId: string | null = null;
        let timeLimit: number | null | undefined = null;
        let passScoreCfg: number | null | undefined = null;
        if (testId) {
          // Direct test preview route
          tId = testId;
        } else if (courseId) {
          const { data } = await api.get(`/courses/${courseId}/test`);
          tId = data?.id || null;
          timeLimit = data?.timeLimitSec ?? null;
          passScoreCfg = data?.passScore ?? null;
        } else if (chapterId) {
          const { data } = await api.get(`/chapters/${chapterId}/test`);
          tId = data?.id || null;
          timeLimit = data?.timeLimitSec ?? null;
          passScoreCfg = data?.passScore ?? null;
          if ((passScoreCfg == null || Number.isNaN(passScoreCfg)) && chapterId) {
            try {
              const ch = await api.get(`/chapters/${chapterId}`).then((r) => r.data);
              passScoreCfg = ch?.passScore ?? passScoreCfg ?? null;
            } catch {}
          }
        } else if (lessonId) {
          const { data } = await api.get(`/lessons/${lessonId}/test`);
          tId = data?.id || null;
          timeLimit = data?.timeLimitSec ?? null;
          passScoreCfg = data?.passScore ?? null;
          // На бэкенде уже подставляется passScore от главы, если у теста он не указан
        }

        if (!tId) {
          throw new Error('TEST_NOT_FOUND');
        }

        // Preview mode: load preview items without attempt
        if (isPreview) {
          const { data } = await api.post(`/tests/${tId}/preview`);
          setTest({ id: tId, timeLimitSec: data?.timeLimitSec ?? timeLimit ?? null, passScore: (data?.passScore ?? null) ?? (passScoreCfg ?? null) });
          setItems(Array.isArray(data?.items) ? data.items : []);
          const effectiveLimit = (typeof data?.timeLimitSec === 'number' && data.timeLimitSec > 0)
            ? data.timeLimitSec
            : ((typeof timeLimit === 'number' && timeLimit > 0) ? timeLimit : null);
          if (effectiveLimit) setTimeLeft(effectiveLimit);
          setAttemptId(null);
          // testId stored implicitly in state via `test`
          // load raw questions for scoring in preview (only for admins)
          if (user?.role === 'ADMIN') {
            try {
              const raw = await api.get(`/tests/${tId}/questions`).then((r) => r.data);
              const meta: Record<string, { points: number; correctIds: Set<string>; optionById: Record<string, string>; text: string; type: Item['type'] }> = {};
              (raw || []).forEach((q: any) => {
                const optionById: Record<string, string> = {};
                (q.answers || []).forEach((a: any) => { optionById[a.id] = a.text; });
                meta[q.id] = { points: q.points || 1, correctIds: new Set((q.answers || []).filter((a: any) => a.isCorrect).map((a: any) => a.id)), optionById, text: q.text, type: q.type } as any;
              });
              setQuestionMeta(meta);
            } catch {}
          }
          startedAtRef.current = Date.now();
          return;
        }

        // Live mode: create attempt
        setTest({ id: tId, timeLimitSec: timeLimit ?? undefined, passScore: passScoreCfg ?? null });
        if (timeLimit) setTimeLeft(timeLimit);
        try {
          const resp = await api.post(`/tests/${tId}/attempts`);
          setAttemptId(resp.data.attemptId);
          setItems(resp.data.items || []);
          // Если сервер вернул лимит времени для попытки — используем его
          if (typeof resp.data?.timeLimitSec === 'number' && resp.data.timeLimitSec > 0) {
            setTimeLeft(resp.data.timeLimitSec);
            setTest((prev) => (prev ? { ...prev, timeLimitSec: resp.data.timeLimitSec } : prev));
          }
          // testId stored implicitly in state via `test`
        } catch (e: any) {
          setItems([]);
        }

        // Load raw meta for preview mode (admin only) to show details after submit
        if (isPreview && user?.role === 'ADMIN') {
          try {
            const raw = await api.get(`/tests/${tId}/questions`).then((r) => r.data);
            const meta: Record<string, { points: number; correctIds: Set<string>; optionById: Record<string, string>; text: string; type: Item['type'] }> = {};
            (raw || []).forEach((q: any) => {
              const optionById: Record<string, string> = {};
              (q.answers || []).forEach((a: any) => { optionById[a.id] = a.text; });
              meta[q.id] = { points: q.points || 1, correctIds: new Set((q.answers || []).filter((a: any) => a.isCorrect).map((a: any) => a.id)), optionById, text: q.text, type: q.type } as any;
            });
            setQuestionMeta(meta);
          } catch {}
        }
        startedAtRef.current = Date.now();
      } catch (e: any) {
        const msg = e?.message === 'TEST_NOT_FOUND'
          ? 'Тест для этого раздела не опубликован или ещё не создан.'
          : 'Не удалось загрузить тест';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [courseId, chapterId, lessonId, testId, isPreview]);

  useEffect(() => {
    if (!(timeLeft > 0)) return;
    if (items.length === 0) return;
    if (completed) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          if (isPreview) {
            setCompleted(true);
          } else {
            void handleSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timeLeft, items.length, isPreview, completed]);

  useEffect(() => {
    if (completed && timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [completed]);

  const remaining = useMemo(() => items.length - Object.keys(answers).filter((k) => (answers[k] || []).length > 0).length, [items.length, answers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const toggleAnswer = (q: Item, answerId: string) => {
    setAnswers((prev) => {
      const next = new Set(prev[q.questionId] || []);
      if (q.type === 'SINGLE') next.clear();
      next.has(answerId) ? next.delete(answerId) : next.add(answerId);
      return { ...prev, [q.questionId]: Array.from(next) };
    });
  };

  const handleSubmit = async () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (isPreview) {
      // локальная оценка по questionMeta
      const details = (items || []).map((q) => {
        const meta = questionMeta[q.questionId];
        const chosen = new Set(answers[q.questionId] || []);
        const correct = meta ? meta.correctIds : new Set<string>();
        let isCorrect = false;
        let isPartial = false;
        let earned = 0;
        const points = meta?.points || 1;
        if (meta) {
          if (q.type === 'MULTI') {
            const hasWrong = [...chosen].some((id) => !correct.has(id));
            const correctChosen = [...chosen].filter((id) => correct.has(id)).length;
            const correctCount = correct.size;
            const full = correctChosen === correctCount && correctCount > 0 && !hasWrong;
            if (full) { isCorrect = true; earned = points; }
            else if (!hasWrong && correctChosen > 0 && correctChosen < correctCount && (correctCount === 2 || correctCount === 3)) {
              isPartial = true; earned = points / 2;
            }
          } else {
            isCorrect = (chosen.size === correct.size && [...correct].every((id) => chosen.has(id)));
            earned = isCorrect ? points : 0;
          }
        }
        return {
          questionId: q.questionId,
          text: meta?.text || q.text,
          points,
          earned,
          isCorrect,
          isPartial,
          chosenIds: [...chosen],
          correctIds: [...correct],
          optionById: meta?.optionById || {},
        };
      });
      const totalPoints = details.reduce((s, d) => s + (d.points || 1), 0);
      const earnedPoints = details.reduce((s, d) => s + (d.earned || 0), 0);
      const percent = Math.round(((earnedPoints || 0) / Math.max(totalPoints || 1, 1)) * 100);
      const pass = (test?.passScore ?? 0);
      const timeSpentSec = startedAtRef.current ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)) : undefined;
      setResult({ score: percent, status: percent >= pass ? 'CREDIT' : 'NO_CREDIT', details, totalPoints, percent, timeSpentSec });
      setCompleted(true);
      return;
    }
    if (!attemptId) return;
    const payload = {
      answers: Object.entries(answers).map(([questionId, answerIds]) => ({ questionId, answerIds })),
    };
    const { data } = await api.post(`/attempts/${attemptId}/submit`, payload);

    // Создаем детализированную сводку на основе данных от backend
    const details = (items || []).map((q) => {
      const optionById: Record<string, string> = {};
      (q.options || []).forEach((o) => { optionById[o.answerId] = o.text; });
      const chosen = new Set(answers[q.questionId] || []);
      const feedback = data.feedback?.find((f: any) => f.questionId === q.questionId);
      
      if (feedback) {
        // Используем данные от backend
        return {
          questionId: q.questionId,
          text: q.text,
          points: feedback.totalPoints,
          earned: feedback.earnedPoints,
          isCorrect: feedback.isCorrect,
          isPartial: feedback.isPartial,
          chosenIds: [...chosen],
          correctIds: feedback.correctAnswers || [],
          optionById,
        };
      } else {
        // Fallback для случая, если feedback недоступен
        return {
          questionId: q.questionId,
          text: q.text,
          points: 1,
          earned: 0,
          isCorrect: false,
          isPartial: false,
          chosenIds: [...chosen],
          correctIds: [],
          optionById,
        };
      }
    });
    // Используем данные от backend для подсчета баллов
    const totalPoints = data.totalPoints || details.reduce((s, d) => s + (d.points || 1), 0);
    const earnedPoints = data.earnedPoints || details.reduce((s, d) => s + (d.earned || 0), 0);
    const percentLocal = Math.round(((earnedPoints || 0) / Math.max(totalPoints || 1, 1)) * 100);
    const timeSpentSec = startedAtRef.current ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)) : undefined;
    const passNeeded = test?.passScore ?? 0;
    const statusFromServer: Verdict = (data?.status === 'PASSED') ? 'CREDIT' : 'NO_CREDIT';
    const percentFromServer = typeof data?.score === 'number' ? Number(data.score) : null;
    const percent = percentFromServer ?? percentLocal;
    setResult({ score: percent, status: statusFromServer, feedback: data.feedback, details, totalPoints, percent, timeSpentSec });
    setCompleted(true);
    push({ type: statusFromServer === 'CREDIT' ? 'success' : 'error', title: statusFromServer === 'CREDIT' ? 'Зачёт' : 'Незачёт', description: `Процент: ${percent}% / ${passNeeded}%` });
  };

  const unansweredIndices = (): number[] => {
    return items.reduce((acc: number[], q, idx) => {
      const chosen = answers[q.questionId] || [];
      if (!chosen || chosen.length === 0) acc.push(idx + 1);
      return acc;
    }, []);
  };

  const [confirm, setConfirm] = useState<{ open: boolean; list: number[] }>({ open: false, list: [] });

  const requestSubmit = () => {
    const missing = unansweredIndices();
    if (missing.length > 0) {
      setConfirm({ open: true, list: missing });
      return;
    }
    void handleSubmit();
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-900 dark:text-white">Загрузка…</div>;
  if (error) return <div className="min-h-[60vh] flex items-center justify-center text-gray-900 dark:text-white">{error}</div>;
  if (!test) return <div className="min-h-[60vh] flex items-center justify-center text-gray-900 dark:text-white">Тест не найден</div>;

  const current = items[currentIndex];
  const isSingle = (t: Item['type']) => t === 'SINGLE' || t === 'BOOLEAN';

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex gap-8 px-4 pt-6 pb-10">
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-5 text-white mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">{courseId ? 'Тест по курсу' : lessonId ? 'Тест урока' : 'Тест модуля'}</div>
                <div className="text-white/90 text-sm">Вопрос {currentIndex + 1} из {items.length} • Осталось без ответа: {remaining}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/80">Осталось времени</div>
                <div className={`text-lg font-mono font-bold ${timeLeft < 300 ? 'text-red-200' : timeLeft < 600 ? 'text-yellow-200' : 'text-emerald-200'}`}>{timeLeft > 0 ? formatTime(timeLeft) : '—'}</div>
              </div>
            </div>
            <div className="mt-3 w-full bg-white/30 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${((currentIndex + 1) / Math.max(items.length, 1)) * 100}%`, opacity: 0.9 }} />
            </div>
          </div>

          {!isPreview && (!attemptId || items.length === 0) && (
            <div className="mb-4 rounded border border-amber-500/40 bg-amber-50 text-amber-700 p-3">
              {lessonId ? 'Чтобы приступить к тесту урока, завершите урок и все предыдущие уроки модуля.' : 'Чтобы приступить к тесту модуля, досмотрите все уроки модуля минимум на 90%.'}
            </div>
          )}

          {!completed && current && (
            <Card>
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-sm font-semibold shadow-sm ring-2 ring-sky-300/40 flex items-center justify-center select-none">{currentIndex + 1}</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{current.text}</h2>
              </div>
              <div className="space-y-3">
                {current.options.map((o) => {
                  const selected = new Set(answers[current.questionId] || []);
                  return (
                    <label key={o.answerId} className="group flex items-center gap-3 p-3 border rounded hover:bg-black/5 cursor-pointer border-black/10 dark:border-white/10 dark:hover:bg-white/10">
                      <input
                        type={isSingle(current.type) ? 'radio' : 'checkbox'}
                        name={current.questionId}
                        checked={selected.has(o.answerId)}
                        onChange={() => toggleAnswer(current, o.answerId)}
                        className="afm-check"
                      />
                      <span className="text-gray-800 dark:text-gray-100">{o.text}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >Назад</Button>
                {items.length > 0 && (
                  <Button onClick={currentIndex === items.length - 1 ? requestSubmit : () => setCurrentIndex((i) => Math.min(items.length - 1, i + 1))}>
                    {currentIndex === items.length - 1 ? 'Завершить тест' : 'Далее'}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {completed && (
            <div className="space-y-4">
              <Card>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">Результаты {isPreview ? '(предпросмотр)' : ''}</div>
                    <span className={`rounded-full px-2 py-0.5 text-sm ${result?.status === 'CREDIT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'}`}>{result?.status === 'CREDIT' ? 'Зачёт' : 'Незачёт'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                      <div className="text-gray-600 dark:text-white/70">Время</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{result?.timeSpentSec != null && test?.timeLimitSec ? `${formatTime(result.timeSpentSec)} / ${formatTime(test.timeLimitSec)}` : '—'}</div>
                    </div>
                    <div className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                      <div className="text-gray-600 dark:text-white/70">Баллы</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{result?.details ? `${result.details.reduce((s, d: any) => s + (d.earned || 0), 0)} / ${result.totalPoints}` : (result?.score ?? 0)}</div>
                    </div>
                    <div className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                      <div className="text-gray-600 dark:text-white/70">Процент</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{result?.percent != null ? `${result.percent}% / ${(test?.passScore ?? 0)}%` : `${result?.score ?? 0}% / ${(test?.passScore ?? 0)}%`}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {result?.details && (
                <Card title="Детализация ответов">
                  <div className="space-y-3">
                    {result.details.map((d: any, idx: number) => (
                      <div key={d.questionId} className="rounded border border-black/10 p-3 dark:border-white/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xs font-semibold shadow-sm ring-2 ring-sky-300/40 flex items-center justify-center select-none">{idx + 1}</div>
                            <div className="font-medium text-gray-900 dark:text-white">{d.text}</div>
                          </div>
                          <span className={`rounded px-2 py-0.5 text-xs ${d.isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : d.isPartial
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'}`}>{d.isCorrect ? 'Верно' : d.isPartial ? 'Частично' : 'Неверно'}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700 dark:text-white/80">Баллы: {d.earned}/{d.points}</div>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Ваш ответ</div>
                            <ul className="list-disc pl-5 text-sm">
                              {(d.chosenIds || []).map((aid: string) => (
                                <li key={aid}>{d.optionById?.[aid] || aid}</li>
                              ))}
                              {(!d.chosenIds || d.chosenIds.length === 0) && <li>—</li>}
                            </ul>
                          </div>
                          {!d.isCorrect && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Правильный ответ</div>
                              <ul className="list-disc pl-5 text-sm">
                                {(d.correctIds || []).map((aid: string) => (
                                  <li key={aid}>{d.optionById?.[aid] || aid}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                {lessonId && (
                  <Button variant="secondary" onClick={() => navigate(`/lessons/${lessonId}`)} title="Вернуться к уроку">
                    К уроку
                  </Button>
                )}
                {chapterId && !lessonId && (
                  <Button variant="secondary" onClick={() => navigate(`/chapters/${chapterId}`)} title="Вернуться к модулю">
                    К модулю
                  </Button>
                )}
                {courseId && (
                  <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)} title="Вернуться к курсу">
                    К курсу
                  </Button>
                )}
                <Button onClick={() => (isPreview ? navigate(-1) : navigate('/'))} className="flex-1 sm:flex-none">
                  {isPreview ? 'Закрыть' : 'На главную'}
                </Button>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={confirm.open}
            title="Есть неотвеченные вопросы"
            description={
              <div className="text-sm text-gray-700 dark:text-white/80">
                Вы не ответили на вопросы: {confirm.list.join(', ')}. Завершить тест?
              </div>
            }
            onClose={() => setConfirm({ open: false, list: [] })}
            confirmText="Завершить"
            onConfirm={async () => { setConfirm({ open: false, list: [] }); await handleSubmit(); }}
          />
        </div>

        {!completed && (
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto styled-scrollbar glass border rounded-xl p-4 dark:border-white/10">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Навигация по вопросам</h3>
              <div className="grid grid-cols-6 gap-2">
                {items.map((q, idx) => {
                  const answered = (answers[q.questionId] || []).length > 0;
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-8 h-8 rounded text-xs font-medium border-2 ${isCurrent ? 'bg-sky-600 text-white border-sky-600' : answered ? 'bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'} dark:${isCurrent ? 'bg-sky-600 text-white border-sky-600' : answered ? 'bg-sky-900/30 text-sky-300 border-sky-700/50 hover:bg-sky-800/30' : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/15'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


