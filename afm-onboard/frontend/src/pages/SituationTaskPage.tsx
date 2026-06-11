import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../components/Toaster';

type Option = { id: string; text: string; isCorrect: boolean };
type Question = { id: string; text: string; options: Option[] };
type SituationTask = {
  id: string;
  title: string;
  scenario: string;
  questions: Question[];
  passScore: number;
};

export default function SituationTaskPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [task, setTask] = useState<SituationTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/lessons/${lessonId}/situation`);
        if (data) {
          data.questions = data.questions ?? [];
          data.questions.forEach((q: any) => { q.options = q.options ?? []; });
        }
        setTask(data);
      } catch {
        setTask(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId]);

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    if (!task) return;
    let correct = 0;
    for (const q of (task.questions ?? [])) {
      const chosen = answers[q.id];
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (chosen && correctOpt && chosen === correctOpt.id) correct++;
    }
    const percent = task.questions.length > 0 ? Math.round((correct / task.questions.length) * 100) : 0;
    setScore(percent);
    setCompleted(true);
    const passed = percent >= (task.passScore ?? 70);
    push({ type: passed ? 'success' : 'error', title: passed ? 'Зачёт' : 'Незачёт', description: `Результат: ${percent}%` });
  };

  const unanswered = task ? (task.questions ?? []).filter((q) => !answers[q.id]).length : 0;
  const current = task?.questions?.[currentIndex];

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-900 dark:text-white">Загрузка…</div>;

  if (!task) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Ситуационная задача не найдена</div>
          <div className="text-gray-600 dark:text-white/70">Для данного урока ситуационная задача ещё не создана.</div>
          <Button variant="secondary" onClick={() => navigate(-1)}>Назад</Button>
        </div>
      </div>
    );
  }

  if (completed && score !== null) {
    const passed = score >= (task.passScore ?? 70);
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-4">
        <div className={`rounded-xl p-6 text-white ${passed ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}>
          <div className="text-2xl font-bold mb-1">{passed ? 'Зачёт' : 'Незачёт'}</div>
          <div className="text-white/90">Ваш результат: {score}% (проходной балл: {task.passScore ?? 70}%)</div>
        </div>
        <Button className="w-full" onClick={() => navigate(-1)}>Вернуться к уроку</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex gap-8 px-4 pt-6 pb-10">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-5 text-white mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Ситуационная задача</div>
                <div className="text-white/90 text-sm">
                  Вопрос {currentIndex + 1} из {task.questions?.length ?? 0} • Осталось без ответа: {unanswered}
                </div>
              </div>
            </div>
            <div className="mt-3 w-full bg-white/30 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full"
                style={{ width: `${((currentIndex + 1) / Math.max(task.questions?.length ?? 1, 1)) * 100}%`, opacity: 0.9 }}
              />
            </div>
          </div>

          {/* Scenario */}
          {task.scenario && (
            <Card>
              <div className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-2">Условие задачи</div>
              <div className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{task.scenario}</div>
            </Card>
          )}

          {/* Question */}
          {current && (
            <Card>
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-sm font-semibold shadow-sm ring-2 ring-sky-300/40 flex items-center justify-center select-none">
                  {currentIndex + 1}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{current.text}</h2>
              </div>
              <div className="space-y-3">
                {current.options.map((o) => (
                  <label
                    key={o.id}
                    className="group flex items-center gap-3 p-3 border rounded hover:bg-black/5 cursor-pointer border-black/10 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    <input
                      type="radio"
                      name={current.id}
                      checked={answers[current.id] === o.id}
                      onChange={() => handleSelect(current.id, o.id)}
                      className="afm-check"
                    />
                    <span className="text-gray-800 dark:text-gray-100">{o.text}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                >
                  Назад
                </Button>
                {currentIndex < (task.questions?.length ?? 1) - 1 ? (
                  <Button onClick={() => setCurrentIndex((i) => i + 1)}>Далее</Button>
                ) : (
                  <Button onClick={handleSubmit}>Завершить</Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar navigation */}
        <div className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-6">
            <Card>
              <div className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Навигация по вопросам</div>
              <div className="flex flex-wrap gap-2">
                {(task.questions ?? []).map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-9 h-9 rounded text-sm font-semibold transition-colors ${
                      i === currentIndex
                        ? 'bg-sky-500 text-white'
                        : answers[q.id]
                        ? 'bg-emerald-500 text-white'
                        : 'bg-black/10 dark:bg-white/10 text-gray-700 dark:text-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
