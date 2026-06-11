import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/Toaster';

type Option = { id?: string; text: string; isCorrect: boolean };
type Question = { id?: string; text: string; options: Option[] };

export default function AdminSituationBuilderPage() {
  const { lessonId } = useParams();
  const { push } = useToast();
  const [title, setTitle] = useState('Ситуационная задача');
  const [scenario, setScenario] = useState('');
  const [passScore, setPassScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonTitle, setLessonTitle] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const lesson = await api.get(`/lessons/${lessonId}`).then((r) => r.data).catch(() => null);
        setLessonTitle(lesson?.title || '');
        const data = await api.get(`/lessons/${lessonId}/situation`).then((r) => r.data).catch(() => null);
        if (data) {
          setTitle(data.title || 'Ситуационная задача');
          setScenario(data.scenario || '');
          setPassScore(data.passScore ?? 70);
          setQuestions(
            (data.questions || []).map((q: any) => ({
              id: q.id,
              text: q.text,
              options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] },
    ]);
  };

  const removeQuestion = (qi: number) => setQuestions((prev) => prev.filter((_, i) => i !== qi));

  const updateQuestion = (qi: number, text: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, text } : q)));

  const updateOption = (qi: number, oi: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text } : o) }),
    );

  const setCorrect = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) }),
    );

  const addOption = (qi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i !== qi ? q : { ...q, options: [...q.options, { text: '', isCorrect: false }] }),
    );

  const removeOption = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i !== qi ? q : { ...q, options: q.options.filter((_, j) => j !== oi) }),
    );

  const save = async () => {
    try {
      await api.post(`/lessons/${lessonId}/situation`, { title, scenario, passScore });
      await api.post(`/lessons/${lessonId}/situation/questions`, {
        questions: questions.map((q, qi) => ({
          text: q.text,
          sortIndex: qi,
          options: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, sortIndex: oi })),
        })),
      });
      push({ type: 'success', title: 'Ситуационная задача сохранена' });
    } catch (e: any) {
      push({ type: 'error', title: 'Ошибка сохранения', description: e?.response?.data?.message || String(e) });
    }
  };

  if (loading) return <div className="p-6 text-white">Загрузка…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Ситуационная задача {lessonTitle ? `— «${lessonTitle}»` : ''}</div>
            <div className="text-white/80 text-sm">Добавьте условие задачи и вопросы</div>
          </div>
          <Button onClick={save} className="sm:self-start">Сохранить</Button>
        </div>
      </div>

      <Card title="Настройки">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200 block mb-1">Заголовок</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200 block mb-1">Условие задачи (сценарий)</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={6}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Опишите ситуацию, которую должен проанализировать пользователь…"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-200">Проходной балл (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(e) => setPassScore(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-20"
            />
          </div>
        </div>
      </Card>

      <Card title="Вопросы">
        <div className="space-y-4">
          {questions.length === 0 && (
            <div className="text-gray-500 dark:text-white/50 text-sm">Вопросов ещё нет. Нажмите «Добавить вопрос».</div>
          )}
          {questions.map((q, qi) => (
            <div key={qi} className="rounded border border-black/10 dark:border-white/10 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-sm font-semibold flex items-center justify-center shrink-0 mt-1">
                  {qi + 1}
                </div>
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, e.target.value)}
                  rows={2}
                  className="flex-1 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Текст вопроса…"
                />
                <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 text-lg shrink-0">🗑</button>
              </div>
              <div className="ml-9 space-y-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={o.isCorrect}
                      onChange={() => setCorrect(qi, oi)}
                      className="shrink-0"
                      title="Отметить как правильный"
                    />
                    <Input
                      value={o.text}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Вариант ${oi + 1}`}
                      className="flex-1"
                    />
                    <button onClick={() => removeOption(qi, oi)} className="text-red-400 hover:text-red-600 text-sm shrink-0">✕</button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(qi)}
                  className="text-sky-500 hover:text-sky-400 text-sm font-medium"
                >
                  + Добавить вариант
                </button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={addQuestion}>+ Добавить вопрос</Button>
        </div>
      </Card>
    </div>
  );
}
