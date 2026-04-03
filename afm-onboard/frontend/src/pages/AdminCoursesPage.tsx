import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toaster';
import CourseCard from '../components/CourseCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';

type Course = { id: string; title: string; description?: string | null; isPublished: boolean; isPublic?: boolean; isArchived?: boolean; version?: number | null; modulesCount?: number; lessonsCount?: number };

export default function AdminCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [q, setQ] = useState('');
  // inline editor removed — editing takes place on the course page
  const [loading, setLoading] = useState(true);
  const { push } = useToast();
  const openCourse = (id: string) => window.location.assign(`/courses/${id}`);
  const [showArchive, setShowArchive] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description?: React.ReactNode; variant?: 'default'|'danger'; confirmText?: string; onConfirm?: () => Promise<void> }>(
    { open: false, title: '' },
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null);
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses/admin/list', { params: { q } });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [q]);

  const activeItems = useMemo(() => {
    const arr = items.filter((c) => !c.isArchived);
    return arr.slice().sort((a, b) => Number(!!b.isPublic) - Number(!!a.isPublic));
  }, [items]);
  const archivedItems = useMemo(() => {
    const arr = items.filter((c) => !!c.isArchived);
    return arr.slice().sort((a, b) => Number(!!b.isPublic) - Number(!!a.isPublic));
  }, [items]);

  const createAndOpen = async () => {
    // создаём курс-черновик и сразу переходим на страницу курса с фокусом на заголовке
    const { data } = await api.post('/courses', { title: '', description: '', isPublished: false });
    window.location.assign(`/courses/${data.id}?focusTitle=1&draft=1`);
  };

  // Удаление курсов с карточек скрыто
  const confirmDelete = async (id: string, title: string) => {
    try {
      // предварительная проверка: запросим удаление без force — сервер вернёт список пользователей если есть
      await api.delete(`/courses/${id}?force=0`);
      setConfirm({
        open: true,
        title: 'Удалить курс?',
        description: (
          <div>
            <div>Действие необратимо. Подтвердите удаление «{title}».</div>
          </div>
        ),
        variant: 'danger',
        confirmText: 'Удалить',
        onConfirm: async () => {
          await api.delete(`/courses/${id}?force=1`);
          push({ type: 'success', title: 'Курс удалён' });
          await load();
        },
      });
    } catch (e: any) {
      const users = e?.response?.data?.error?.details?.users || e?.response?.data?.users || [];
      setConfirm({
        open: true,
        title: 'Удалить курс?',
        description: (
          <div>
            <div>Действие необратимо. Подтвердите удаление «{title}».</div>
            {Array.isArray(users) && users.length ? (
              <div className="mt-2 text-sm text-gray-700 dark:text-white/80">
                Есть незавершившие: {users.map((u: any) => u.fullName || u.email).slice(0, 10).join(', ')}{users.length > 10 ? ' и др.' : ''}
              </div>
            ) : null}
          </div>
        ),
        variant: 'danger',
        confirmText: 'Удалить',
        onConfirm: async () => {
          await api.delete(`/courses/${id}?force=1`);
          push({ type: 'success', title: 'Курс удалён' });
          await load();
        },
      });
    }
  };

  const confirmArchive = async (id: string, _title: string, toArchive: boolean) => {
    try {
      // предварительная проверка
      await api.patch(`/courses/${id}/archive`, { isArchived: toArchive, force: false });
      setConfirm({
        open: true,
        title: toArchive ? 'Архивировать курс?' : 'Восстановить из архива?',
        description: toArchive ? 'Подтвердите архивирование. Курс будет перемещён в архив.' : 'Подтвердите восстановление курса из архива.',
        confirmText: toArchive ? 'Архивировать' : 'Восстановить',
        onConfirm: async () => {
          await api.patch(`/courses/${id}/archive`, { isArchived: toArchive, force: true });
          push({ type: 'success', title: toArchive ? 'Курс архивирован' : 'Курс восстановлен' });
          await load();
        },
      });
    } catch (e: any) {
      const users = e?.response?.data?.error?.details?.users || e?.response?.data?.users || [];
      setConfirm({
        open: true,
        title: toArchive ? 'Архивировать курс?' : 'Восстановить из архива?',
        description: (
          <div>
            <div>{toArchive ? 'Подтвердите архивирование. Курс будет перемещён в архив.' : 'Подтвердите восстановление курса из архива.'}</div>
            {Array.isArray(users) && users.length ? (
              <div className="mt-2 text-sm text-gray-700 dark:text-white/80">
                Есть незавершившие: {users.map((u: any) => u.fullName || u.email).slice(0, 10).join(', ')}{users.length > 10 ? ' и др.' : ''}
              </div>
            ) : null}
          </div>
        ),
        confirmText: toArchive ? 'Архивировать' : 'Восстановить',
        onConfirm: async () => {
          await api.patch(`/courses/${id}/archive`, { isArchived: toArchive, force: true });
          push({ type: 'success', title: toArchive ? 'Курс архивирован' : 'Курс восстановлен' });
          await load();
        },
      });
    }
  };

  // Переключение общедоступности выполняется на странице курса

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Создание курсов</h2>
          <div className="text-sm text-gray-600 dark:text-white/70">Создавайте и редактируйте курсы. Модули (главы) привязываются к курсу.</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Input placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={createAndOpen} className="w-full sm:w-auto">Новый курс</Button>
        </div>
      </div>

      {loading ? (
        <Card><div>Загрузка...</div></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeItems.map((c) => (
              <CourseCard
                key={c.id}
                course={{ id: c.id, title: c.title, description: c.description ?? '', version: c.version ?? null, isPublic: c.isPublic ?? null, isArchived: c.isArchived ?? null }}
                onOpen={openCourse}
                publicLabel="общедоступный"
                onPublicClick={async (id, next) => {
                  await api.patch(`/courses/${id}/public`, { isPublic: next });
                  await load();
                }}
                actionsBottomLeft={
                  <>
                    <div className="relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        title="Ещё"
                        className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId((v) => (v === c.id ? null : c.id)); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                      {openMenuId === c.id && (
                        <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              const title = c.isPublic ? 'Отменить общий доступ?' : 'Сделать общедоступным?';
                              const desc = (
                                <div>
                                  {c.isPublic ? (
                                    <div>Текущие сотрудники сохранят доступ к «{c.title}», но новые сотрудники автоматически доступ не получат.</div>
                                  ) : (
                                    <div>Все текущие и будущие сотрудники АФМ получат доступ к «{c.title}».</div>
                                  )}
                                </div>
                              );
                              setConfirm({
                                open: true,
                                title,
                                description: desc,
                                variant: 'default',
                                confirmText: c.isPublic ? 'Подтвердить' : 'Сделать общедоступным',
                                onConfirm: async () => {
                                  await api.patch(`/courses/${c.id}/public`, { isPublic: !c.isPublic });
                                  await load();
                                },
                              });
                              setTimeout(() => setOpenMenuId(null), 0);
                            }}
                          >
                            {c.isPublic ? 'Отменить общий доступ' : 'Сделать общедоступным'}
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      title="Архивировать"
                      className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation?.(); e.preventDefault(); confirmArchive(c.id, c.title, true); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="4"/><path d="M19 7v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
                    <button
                      title="Удалить"
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      onClick={(e) => { e.stopPropagation?.(); e.preventDefault(); confirmDelete(c.id, c.title); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex justify-center">
        <button
          className="text-sm text-gray-600 hover:underline dark:text-white/70"
          onClick={() => setShowArchive((v) => !v)}
        >
          {showArchive ? 'Скрыть архив' : 'Показать архив'}
        </button>
      </div>

      {showArchive && (
        <Card className="mt-4">
          {archivedItems.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-white/70">Архив пуст.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {archivedItems.map((c) => (
                <CourseCard
                  key={c.id}
                  course={{ id: c.id, title: c.title, description: c.description ?? '', version: c.version ?? null, isPublic: c.isPublic ?? null, isArchived: c.isArchived ?? null }}
                  onOpen={openCourse}
                  publicLabel="общедоступный"
                  onPublicClick={async (id, next) => {
                    await api.patch(`/courses/${id}/public`, { isPublic: next });
                    await load();
                  }}
                  actionsBottomLeft={
                    <>
                      <button
                        title="Восстановить из архива"
                        className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                        onClick={(e) => { e.stopPropagation?.(); e.preventDefault(); confirmArchive(c.id, c.title, false); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 7v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7"/><path d="M10 12h4"/></svg>
                      </button>
                      <button
                        title="Удалить"
                        className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        onClick={(e) => { e.stopPropagation?.(); e.preventDefault(); confirmDelete(c.id, c.title); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        variant={confirm.variant}
        confirmText={confirm.confirmText}
        onClose={() => setConfirm({ open: false, title: '' })}
        onConfirm={async () => { if (confirm.onConfirm) await confirm.onConfirm(); }}
      />

      
    </div>
  );
}


