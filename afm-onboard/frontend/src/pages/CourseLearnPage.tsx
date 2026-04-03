import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type Chapter = { id: string; orderIndex: number; title: string; description?: string; _count?: { lessons?: number }; status?: 'LOCKED'|'AVAILABLE'|'COMPLETED'; progressPercent?: number; bestScore?: number };

export default function CourseLearnPage() {
  const { courseId } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | null>('');
  const [modules, setModules] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCourseTest, setHasCourseTest] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/courses/${courseId}`);
        setTitle(data.title);
        setDescription(data.description || '');
        setModules(data.chapters || []);
        try {
          const t = await api.get(`/courses/${courseId}/test`).then((r) => r.data).catch(() => null);
          setHasCourseTest(!!t?.id);
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-2">
          <div className="text-2xl font-semibold">{title || 'Курс'}</div>
          <div className="text-sm text-gray-700 dark:text-white/80">{description || 'Описание отсутствует'}</div>
        </div>
      </Card>

      <Card title="Модули курса">
        {modules.length === 0 ? (
          <div className="text-gray-600 dark:text-white/70">Модули ещё не добавлены.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {modules.map((m) => (
              <div key={m.id} className="rounded border border-black/10 p-3 dark:border-white/10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{m.orderIndex}. {m.title}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80 whitespace-nowrap">
                    Уроков: {m._count?.lessons ?? 0}
                  </span>
                </div>
                {m.description && <div className="mt-1 text-sm text-gray-600 dark:text-white/70" style={{ display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{m.description}</div>}
                <div className="flex-1" />
                <div className="mt-2">
                  <div className="h-2 w-full rounded bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className={`h-2 ${m.progressPercent === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${Math.min(Math.max(m.progressPercent ?? 0, 0), 100)}%` }} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-600 dark:text-white/70">Оценка за тест модуля: <span className="font-medium text-gray-800 dark:text-white">{typeof m.bestScore === 'number' ? `${m.bestScore}%` : '—'}</span></div>
                  <Link to={`/chapters/${m.id}`}>
                    <Button disabled={m.status === 'LOCKED'} title={m.status === 'LOCKED' ? 'Модуль заблокирован' : undefined}>
                      {m.status === 'COMPLETED' ? (
                        <>
                          <span className="hidden sm:inline">Просмотреть</span>
                          <span className="sm:hidden">Просмотр</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Открыть модуль</span>
                          <span className="sm:hidden">Модуль</span>
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {hasCourseTest && (
              <div className="rounded border border-black/10 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Тест по курсу</div>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <Link to={`/courses/${courseId}/test`}>
                    <Button>
                      <span className="hidden sm:inline">Начать тест</span>
                      <span className="sm:hidden">Тест</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}


