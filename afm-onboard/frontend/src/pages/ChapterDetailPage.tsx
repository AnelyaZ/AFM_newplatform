import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
 

type Chapter = {
  id: string;
  orderIndex: number;
  title: string;
  description?: string;
  passScore: number;
  contents?: { id: string; blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[];
};

function ChapterLessons({ chapterId, onAllCompleted }: { chapterId: string; onAllCompleted?: (done: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<{ id: string; orderIndex: number; title: string; description?: string; contents?: any[]; progress?: { completed?: boolean } }[]>([]);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/chapters/${chapterId}/lessons`);
        setItems(data);
        if (onAllCompleted) {
          const allDone = Array.isArray(data) && data.length > 0 ? data.every((l: any) => !!l.progress?.completed) : false;
          onAllCompleted(allDone);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [chapterId]);
  if (loading) return <div>Загрузка...</div>;
  if (!items.length) return <div className="text-gray-600 dark:text-white/70">Уроки ещё не добавлены.</div>;
  return (
    <div className="space-y-2">
      {items.map((l, idx) => {
        const isDone = !!l.progress?.completed;
        const isFirst = idx === 0;
        const prevDone = isFirst ? true : !!items[idx - 1].progress?.completed;
        const isLocked = !prevDone;
        if (isLocked) {
          return (
            <div key={l.id} className="block cursor-not-allowed rounded border border-black/10 p-3 opacity-60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="font-medium">{l.orderIndex}. {l.title}</div>
                <div className={`text-xs ${isDone ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-white/50'}`}>{isDone ? 'завершено' : 'не завершено'}</div>
              </div>
              {l.description && <div className="text-sm text-gray-600 dark:text-white/70">{l.description}</div>}
              <div className="mt-1 text-xs text-gray-500 dark:text-white/50">Откроется после просмотра предыдущего урока</div>
            </div>
          );
        }
        return (
          <Link key={l.id} to={`/lessons/${l.id}`} className="block rounded border border-black/10 p-3 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="font-medium">{l.orderIndex}. {l.title}</div>
              <div className={`text-xs ${isDone ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-white/50'}`}>{isDone ? 'завершено' : 'не завершено'}</div>
            </div>
            {l.description && <div className="text-sm text-gray-600 dark:text-white/70">{l.description}</div>}
          </Link>
        );
      })}
    </div>
  );
}

export default function ChapterDetailPage() {
  const { id } = useParams();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonsCompleted, setLessonsCompleted] = useState(false);
  const [hasTest, setHasTest] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/chapters/${id}`);
        setChapter(data);
        try {
          const t = await api.get(`/chapters/${id}/test`).then((r) => r.data).catch(() => null);
          setHasTest(!!t?.id && !!t?.isPublished);
        } catch {
          setHasTest(false);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (!chapter) return <div>Модуль не найден</div>;

  return (
    <div className="space-y-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-sky-600 text-xs text-white">{chapter.orderIndex}</span>
            <span>{chapter.title}</span>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-gray-700 dark:text-white/80">{chapter.description || 'Описание отсутствует'}</div>
          <div className="text-sm text-gray-600 dark:text-white/60">Проходной балл: {chapter.passScore}</div>
          {typeof (chapter as any).progressPercent === 'number' && (
            <div className="text-sm text-white/70">Прогресс уроков: {(chapter as any).progressPercent}%</div>
          )}
        </div>
      </Card>

      
       <Card title="Уроки модуля">
        <ChapterLessons chapterId={chapter.id} onAllCompleted={setLessonsCompleted} />
      </Card>
      

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-white/70">Когда будете готовы, начните тест по модулю.</div>
          {hasTest === false && (
            <div className="text-sm text-amber-700 dark:text-amber-300">Тест для этого модуля пока не опубликован.</div>
          )}
          {hasTest && lessonsCompleted ? (
            <Link to={`/chapters/${chapter.id}/test`} className="w-full md:w-auto">
              <Button className="w-full md:w-auto">
                <span className="hidden sm:inline">Начать тест</span>
                <span className="sm:hidden">Тест</span>
              </Button>
            </Link>
          ) : (
            <div className="w-full md:w-auto">
              <Button className="w-full md:w-auto" disabled>
                <span className="hidden sm:inline">Начать тест</span>
                <span className="sm:hidden">Тест</span>
              </Button>
              {hasTest ? (
                <div className="mt-1 text-xs text-gray-500 dark:text-white/50">Завершите все уроки модуля, чтобы начать тест.</div>
              ) : (
                <div className="mt-1 text-xs text-gray-500 dark:text-white/50">Тест пока недоступен.</div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


