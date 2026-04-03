import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import { useToast } from '../components/Toaster';

type Block = { id?: string; blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number };

export default function AdminLessonContentPage() {
  const { lessonId, id: chapterId } = useParams();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/chapters/${chapterId}/lessons/${lessonId}`);
      setBlocks((data?.contents as Block[] | undefined) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [lessonId]);

  const addBlock = () => setBlocks((b) => [...b, { blockType: 'TEXT', textHtml: '', mediaKey: null, sortIndex: (b[b.length-1]?.sortIndex ?? 0) + 1 }]);
  const remove = (idx: number) => setBlocks((b) => b.filter((_, i) => i !== idx).map((x, i) => ({ ...x, sortIndex: i + 1 })));
  const move = (idx: number, dir: -1 | 1) => setBlocks((b) => {
    const a = [...b];
    const ni = idx + dir;
    if (ni < 0 || ni >= a.length) return a;
    [a[idx], a[ni]] = [a[ni], a[idx]];
    return a.map((x, i) => ({ ...x, sortIndex: i + 1 }));
  });

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
   const { data } = await api.post('/uploads/file', form);
    return data.key as string;
  };

  const save = async () => {
    // Клиентская валидация: не более одного видео-блока
    const videoCount = blocks.filter((x) => x.blockType === 'VIDEO').length;
    if (videoCount > 1) {
      push({ type: 'error', title: 'Ошибка', description: 'В уроке может быть только один видео-блок.' });
      return;
    }
    await api.post(`/chapters/${chapterId}/lessons/${lessonId}/contents`, {
      blocks: blocks.map(({ id: _ignore, ...b }) => b),
    });
    push({ type: 'success', title: 'Контент урока сохранён' });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <h2 className="text-2xl font-semibold">Контент урока</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="secondary" onClick={addBlock} className="w-full sm:w-auto">Добавить блок</Button>
          <Button onClick={save} className="w-full sm:w-auto">Сохранить</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <div className="space-y-4">
            {blocks.map((b, idx) => (
              <div key={idx} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3 w-full md:w-auto">
                    <Select
                      label="Тип блока"
                      value={b.blockType}
                      onChange={(e) => setBlocks((arr) => {
                        const nextType = e.target.value as Block['blockType'];
                        if (nextType === 'VIDEO') {
                          const isCurrentlyVideo = arr[idx].blockType === 'VIDEO';
                          const hasAnotherVideo = arr.some((z, j) => j !== idx && z.blockType === 'VIDEO');
                          if (!isCurrentlyVideo && hasAnotherVideo) {
                            push({ type: 'error', title: 'Ограничение', description: 'Во втором блоке нельзя выбрать «Видео». Тип заменён на «Текст».' });
                            return arr.map((x, i) => i === idx ? { ...x, blockType: 'TEXT' } : x);
                          }
                        }
                        return arr.map((x, i) => i === idx ? { ...x, blockType: nextType } : x);
                      })}
                      options={[
                        { value: 'TEXT', label: 'Текст' },
                        { value: 'IMAGE', label: 'Изображение' },
                        { value: 'VIDEO', label: 'Видео' },
                        { value: 'FILE', label: 'Файл' },
                      ]}
                    />
                    <Input label="Порядок" type="number" value={b.sortIndex} onChange={(e) => setBlocks((arr) => arr.map((x, i) => i === idx ? { ...x, sortIndex: Number(e.target.value) } : x))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => move(idx, -1)}>Вверх</Button>
                    <Button size="sm" variant="secondary" onClick={() => move(idx, 1)}>Вниз</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(idx)}>Удалить</Button>
                  </div>
                </div>

                {b.blockType === 'TEXT' && (
                  <TextArea label="HTML/текст" value={b.textHtml ?? ''} onChange={(e) => setBlocks((arr) => arr.map((x, i) => i === idx ? { ...x, textHtml: e.target.value } : x))} />
                )}
                {b.blockType !== 'TEXT' && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-white/70">Медиа-файл</div>
                    <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = async () => {
                              const f = (input.files || [])[0];
                              if (!f) return;
                              const key = await uploadFile(f);
                              setBlocks((arr) => arr.map((x, i) => i === idx ? { ...x, mediaKey: key } : x));
                            };
                            input.click();
                          }}
                        >Выберите файл</Button>
                        {b.mediaKey && (<span className="truncate text-sm text-gray-600 dark:text-white/70">{b.mediaKey}</span>)}
                      </div>
                    </div>
                  </div>
                )}
                {b.blockType === 'VIDEO' && b.mediaKey && (
                  <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm text-white/80">
                    <div className="mb-2">Предпросмотр видео</div>
                    <video className="w-full rounded" controls src={b.mediaKey} />
                  </div>
                )}
                {b.blockType === 'IMAGE' && b.mediaKey && (
                  <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm text-white/80">
                    <div className="mb-2">Предпросмотр изображения</div>
                    <img className="max-h-80 w-auto rounded" src={b.mediaKey} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


