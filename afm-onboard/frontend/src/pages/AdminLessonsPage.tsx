import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TextArea from '../components/ui/TextArea';
import { useToast } from '../components/Toaster';

type Lesson = { id: string; orderIndex: number; title: string; description?: string | null };

export default function AdminLessonsPage() {
  const { id: chapterId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<Lesson[]>([]);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = async () => {
    if (!chapterId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/chapters/${chapterId}/lessons`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [chapterId]);

  const resetForm = () => setEditing({ id: '', orderIndex: (items[items.length - 1]?.orderIndex ?? 0) + 1, title: '', description: '' });

  const save = async () => {
    if (!chapterId || !editing) return;
    if (editing.id) {
      await api.patch(`/chapters/${chapterId}/lessons/${editing.id}`, {
        orderIndex: editing.orderIndex,
        title: editing.title,
        description: editing.description ?? null,
      });
      push({ type: 'success', title: 'Урок обновлён' });
    } else {
      await api.post(`/chapters/${chapterId}/lessons`, {
        orderIndex: editing.orderIndex,
        title: editing.title,
        description: editing.description ?? null,
      });
      push({ type: 'success', title: 'Урок создан' });
    }
    setEditing(null);
    await load();
  };

  const remove = async (lessonId: string) => {
    if (!chapterId) return;
    await api.delete(`/chapters/${chapterId}/lessons/${lessonId}`);
    push({ type: 'success', title: 'Урок удалён' });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-semibold">Уроки модуля</h2>
          <div className="text-sm text-gray-600 dark:text-white/70">Создавайте, редактируйте и упорядочивайте уроки. Управляйте их контентом (видео, текст, файлы).</div>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={() => navigate(`/admin/chapters/${chapterId}/contents`)} className="w-full sm:w-auto">Материалы модуля</Button>
          <Button onClick={resetForm} className="w-full sm:w-auto">Новый урок</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((l) => (
              <div key={l.id} className="glass rounded-lg border border-black/10 p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-900 dark:text-white">{l.orderIndex}. {l.title}</div>
                    {l.description ? (<div className="text-sm text-gray-600 dark:text-white/60 line-clamp-1">{l.description}</div>) : null}
                  </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(l)}>Редактировать</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/chapters/${chapterId}/lessons/${l.id}`)}>Контент урока</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/lessons/${l.id}/test`)}>Тест урока</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(l.id)}>Удалить</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <Card title={editing.id ? 'Редактировать урок' : 'Новый урок'}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Порядок" type="number" value={editing.orderIndex} onChange={(e) => setEditing({ ...editing, orderIndex: Number(e.target.value) })} />
            <Input label="Заголовок" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <TextArea className="md:col-span-2" label="Описание" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </div>
        </Card>
      )}
    </div>
  );
}


