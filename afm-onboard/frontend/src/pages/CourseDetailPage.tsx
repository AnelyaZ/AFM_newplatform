import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/Toaster';
import { useAuthStore } from '../store/auth';

type Chapter = { id: string; orderIndex: number; title: string; description?: string; passScore: number; isPublished: boolean; _count?: { lessons?: number } };

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | null>('');
  const [modules, setModules] = useState<Chapter[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingModule, setCreatingModule] = useState<null | { title: string; description: string }>(null);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Array<{ user: { id: string; fullName: string; email: string } }>>([]);
  const [uq, setUq] = useState('');
  const [userOptions, setUserOptions] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const { push } = useToast();
  const user = useAuthStore((s) => s.user);
  const createTitleRef = useRef<HTMLInputElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [openTestMenu, setOpenTestMenu] = useState(false);
  const testMenuRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'participants' | 'settings'>('modules');
  const [allCourses, setAllCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [prereqIds, setPrereqIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const shouldFocusTitle = useMemo(() => user?.role === 'ADMIN' && searchParams.get('focusTitle') === '1', [searchParams, user?.role]);
  const isDraftOpen = useMemo(() => user?.role === 'ADMIN' && searchParams.get('draft') === '1', [searchParams, user?.role]);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const autoResizeDesc = () => {
    if (!descRef.current || user?.role !== 'ADMIN') return;
    const el = descRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    (async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        // Выбираем API в зависимости от роли пользователя
        const isAdmin = user?.role === 'ADMIN';
        const apiEndpoint = isAdmin ? `/courses/admin/by-id/${courseId}` : `/courses/${courseId}`;
        
        const { data } = await api.get(apiEndpoint);
        setTitle(data.title);
        setDescription(data.description || '');
        setModules(data.chapters || []);
        setIsPublished(!!data.isPublished);
        setVersion(typeof data.version === 'number' ? data.version : null);
        
        // Загружаем пререквизиты только для админов
        if (isAdmin) {
          try {
            const pre = await api.get(`/courses/${courseId}/prerequisites`).then((r) => r.data);
            const ids = Array.isArray(pre) ? pre.map((x: any) => x.requiredCourse?.id).filter(Boolean) : [];
            setPrereqIds(ids);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, user?.role]);

  useEffect(() => {
    if (shouldFocusTitle && titleRef.current && user?.role === 'ADMIN') {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [shouldFocusTitle, titleRef.current, user?.role]);

  useEffect(() => {
    autoResizeDesc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  useEffect(() => {
    if (creatingModule && createTitleRef.current && user?.role === 'ADMIN') {
      setTimeout(() => createTitleRef.current?.focus(), 30);
    }
  }, [creatingModule, user?.role]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!testMenuRef.current) return;
      if (!testMenuRef.current.contains(e.target as Node)) setOpenTestMenu(false);
    };
    if (openTestMenu) document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [openTestMenu]);

  useEffect(() => {
    const onAnyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-module-menu]')) setMenuOpenId(null);
    };
    if (menuOpenId) document.addEventListener('mousedown', onAnyClick);
    return () => document.removeEventListener('mousedown', onAnyClick);
  }, [menuOpenId]);

  const reload = async () => {
    if (!courseId || user?.role !== 'ADMIN') return;
    const isAdmin = user?.role === 'ADMIN';
    const apiEndpoint = isAdmin ? `/courses/admin/by-id/${courseId}` : `/courses/${courseId}`;
    
    const { data } = await api.get(apiEndpoint);
    setModules(data.chapters || []);
    setIsPublished(!!data.isPublished);
  };

  const persistCourse = async (payload: Partial<{ title: string; description: string }>) => {
    if (!courseId || user?.role !== 'ADMIN') return;
    if ((version ?? 0) > 0) return;
    try {
      await api.patch(`/courses/${courseId}`, payload);
    } catch {
      push({ type: 'error', title: 'Не удалось сохранить изменения' });
    }
  };

  // Авто-отмена пустых черновиков: переносим удаление только на unload-событие браузера без повторного вызова в cleanup
  useEffect(() => {
    const onBeforeUnload = () => {
      // Блокируем повторные тосты: тихий запрос
      try {
        if (!courseId || user?.role !== 'ADMIN') return;
        const empty = (title.trim() === '' && (description || '').trim() === '' && (modules || []).length === 0);
        if (isDraftOpen && empty) {
          // Отправляем фоново, без ожидания
          // fetch используем напрямую, чтобы не триггерить интерсептор и тосты
          navigator.sendBeacon?.(`${api.defaults.baseURL}/courses/${courseId}?access_token=${encodeURIComponent((useAuthStore.getState().accessToken || ''))}`, new Blob());
        }
      } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDraftOpen, courseId, title, description, modules, user?.role]);

  const loadParticipants = async () => {
    if (!courseId) return;
    try {
      const { data } = await api.get(`/courses/${courseId}/access`);
      setParticipants(Array.isArray(data) ? data : []);
    } catch {
      setParticipants([]);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadParticipants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.role]);

  useEffect(() => {
    if (!uq || user?.role !== 'ADMIN') {
      setUserOptions([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/users', {
          params: { q: uq, status: 'APPROVED', page: 1, limit: 10 },
        });
        if (!active) return;
        const mapped = (Array.isArray(data) ? data : []).map((u: any) => ({ id: u.id, fullName: u.fullName, email: u.email }));
        setUserOptions(mapped);
      } catch {
        if (!active) return;
        setUserOptions([]);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [uq, user?.role]);

  const isParticipant = (userId: string) => {
    if (user?.role !== 'ADMIN') return false;
    return participants.some((p) => p.user?.id === userId);
  };

  const addParticipant = async (userId: string) => {
    if (!courseId || user?.role !== 'ADMIN') return;
    try {
      await api.post(`/courses/${courseId}/access`, { userId });
      push({ type: 'success', title: 'Доступ выдан' });
      await loadParticipants();
    } catch (e) {
      push({ type: 'error', title: 'Добавление участников недоступно до публикации' });
    }
  };

  const removeParticipant = async (userId: string) => {
    if (!courseId || user?.role !== 'ADMIN') return;
    try {
      await api.delete(`/courses/${courseId}/access/${userId}`);
      push({ type: 'success', title: 'Доступ отозван' });
      await loadParticipants();
    } catch (e) {
      push({ type: 'error', title: 'Изменение участников недоступно в режиме редактирования' });
    }
  };

  const saveNewModule = async () => {
    if (!courseId || !creatingModule || user?.role !== 'ADMIN') return;
    const nextOrder = (modules[modules.length - 1]?.orderIndex ?? 0) + 1;
    const payload = {
      courseId,
      orderIndex: nextOrder,
      title: creatingModule.title || 'Новый модуль',
      description: creatingModule.description || null,
      passScore: 70,
      isPublished: false,
    } as any;
    try {
      await api.post(`/chapters`, payload);
    } catch {
      push({ type: 'error', title: 'Редактирование возможно, но участники будут заблокированы до публикации новой версии' });
    }
    setCreatingModule(null);
    await reload();
  };

  const persistOrder = async (list: Chapter[]) => {
    if (user?.role !== 'ADMIN') return;
    setIsOrdering(true);
    try {
      const updates = list.map((m, idx) => {
        const desired = idx + 1;
        if (m.orderIndex === desired) return null;
        return api.patch(`/chapters/${m.id}`, { orderIndex: desired });
      }).filter(Boolean) as Promise<any>[];
      if (updates.length) await Promise.all(updates);
      // Update local indices to match
      setModules((prev) => prev.map((m) => ({ ...m, orderIndex: list.find((x) => x.id === m.id)?.orderIndex ?? m.orderIndex })));
      push({ type: 'success', title: 'Порядок модулей обновлён' });
    } catch {
      push({ type: 'error', title: 'Не удалось сохранить порядок модулей' });
      await reload();
    } finally {
      setIsOrdering(false);
    }
  };

  const handleDropReorder = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || user?.role !== 'ADMIN') return;
    const from = modules.findIndex((m) => m.id === draggingId);
    const to = modules.findIndex((m) => m.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const arr = [...modules];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    // Renumber locally for UX
    const renumbered = arr.map((m, i) => ({ ...m, orderIndex: i + 1 }));
    setModules(renumbered);
    setDraggingId(null);
    await persistOrder(renumbered);
  };

  // const removeModule = async (id: string) => {
  //   await api.delete(`/chapters/${id}`);
  //   await reload();
  // };

  const startEditModule = (m: Chapter) => {
    setEditingId(m.id);
    setEditTitle(m.title || '');
    setEditDescription(m.description || '');
    setMenuOpenId(null);
  };

  const cancelEditModule = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const saveEditModule = async (id: string) => {
    if (user?.role !== 'ADMIN') return;
    try {
      await api.patch(`/chapters/${id}`, { title: editTitle, description: editDescription });
      setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title: editTitle, description: editDescription } : m)));
      setEditingId(null);
      push({ type: 'success', title: 'Модуль обновлён' });
    } catch {
      push({ type: 'error', title: 'Не удалось сохранить модуль' });
    }
  };

  const confirmDeleteModule = (id: string) => {
    setConfirmDeleteId(id);
    setMenuOpenId(null);
  };

  const deleteModule = async (id: string) => {
    if (user?.role !== 'ADMIN') return;
    try {
      await api.delete(`/chapters/${id}`);
      setModules((prev) => prev.filter((m) => m.id !== id));
      push({ type: 'success', title: 'Модуль удалён' });
    } catch {
      push({ type: 'error', title: 'Не удалось удалить модуль' });
    }
  };

  const participantsLocked = user?.role !== 'ADMIN' || !isPublished; // при снятой публикации/черновике блокируем участников

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                <div className="min-w-0">
                  {user?.role === 'ADMIN' ? (
                    <input
                      ref={titleRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => user?.role === 'ADMIN' && persistCourse({ title })}
                      placeholder="Название курса"
                      className="block w-full rounded-md bg-transparent px-1 text-2xl font-semibold text-gray-900 outline-none ring-2 ring-transparent transition-all placeholder:text-gray-400 hover:ring-sky-300 focus:ring-sky-500 dark:text-white dark:hover:ring-sky-700"
                      disabled={(version ?? 0) > 0 || user?.role !== 'ADMIN'}
                    />
                  ) : (
                    <div className="text-2xl font-semibold line-clamp-2 text-gray-900 dark:text-white">{title}</div>
                  )}
                </div>
                {typeof version === 'number' ? (
                  <span className="whitespace-nowrap rounded-full bg-black/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80">V{version}</span>
                ) : null}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              {user?.role === 'ADMIN' && (
                <>
                  <a href={`/admin/courses/${courseId}/test`}>
                    <Button variant="secondary" title="Редактировать тест по курсу" className="h-10 px-4 text-[13px]">Редактировать тест</Button>
                  </a>
                  <Button
                    variant={isPublished ? 'secondary' : 'primary'}
                    onClick={async () => {
                      try {
                        if (isPublished) {
                          await api.patch(`/courses/${courseId}`, { isPublished: false });
                          setIsPublished(false);
                          push({ type: 'success', title: 'Публикация снята' });
                        } else {
                          const { data } = await api.post(`/courses/${courseId}/publish`);
                          push({ type: 'success', title: `Опубликована версия V${data.version}` });
                        }
                      } catch {
                        push({ type: 'error', title: 'Не удалось выполнить публикацию' });
                      }
                    }}
                    className="h-10 px-4 text-[13px]"
                  >
                    {isPublished ? 'Снять с публикации' : 'Опубликовать курс'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {user?.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-2 sm:hidden">
              <a href={`/admin/courses/${courseId}/test`}>
                <Button variant="secondary" title="Редактировать тест по курсу" className="h-10 px-4 text-[13px]">Редактировать тест</Button>
              </a>
              <Button
                variant={isPublished ? 'secondary' : 'primary'}
                onClick={async () => {
                  try {
                    if (isPublished) {
                      await api.patch(`/courses/${courseId}`, { isPublished: false });
                      setIsPublished(false);
                      push({ type: 'success', title: 'Публикация снята' });
                    } else {
                      const { data } = await api.post(`/courses/${courseId}/publish`);
                      push({ type: 'success', title: `Опубликована версия V${data.version}` });
                    }
                  } catch {
                    push({ type: 'error', title: 'Не удалось выполнить публикацию' });
                  }
                }}
                className="h-10 px-4 text-[13px]"
              >
                {isPublished ? 'Снять с публикации' : 'Опубликовать курс'}
              </Button>
            </div>
          )}
          <textarea
            ref={descRef}
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
            onInput={autoResizeDesc}
            onBlur={() => user?.role === 'ADMIN' && persistCourse({ description: description || '' })}
            placeholder="Добавьте описание курса"
            className="min-h-[80px] w-full resize-none overflow-hidden rounded-md bg-transparent px-1 text-sm text-gray-700 outline-none ring-2 ring-transparent transition-all placeholder:text-gray-400 hover:ring-sky-300 focus:ring-sky-500 dark:text-white/80 dark:hover:ring-sky-700"
            style={{ height: 'auto' }}
            disabled={(version ?? 0) > 0 || user?.role !== 'ADMIN'}
          />
        </div>
      </Card>

      {/* Табы: Модули | Участники */}
      <div className="flex items-center gap-2">
        <button
          className={`rounded px-3 py-1 text-sm ${activeTab === 'modules' ? 'bg-sky-600 text-white' : 'bg-black/5 text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15'}`}
          onClick={() => setActiveTab('modules')}
        >Модули курса</button>
        {user?.role === 'ADMIN' && (
          <button
            className={`rounded px-3 py-1 text-sm ${activeTab === 'participants' ? 'bg-sky-600 text-white' : 'bg-black/5 text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15'}`}
            onClick={() => setActiveTab('participants')}
          >Участники курса</button>
        )}
        {user?.role === 'ADMIN' && (
          <button
            className={`rounded px-3 py-1 text-sm ${activeTab === 'settings' ? 'bg-sky-600 text-white' : 'bg-black/5 text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15'}`}
            onClick={async () => {
              setActiveTab('settings');
              // лениво загрузим список курсов для выбора
              try {
                const { data } = await api.get('/courses/admin/list');
                const options = (Array.isArray(data) ? data : []).map((c: any) => ({ id: c.id, title: `${c.title}${typeof c.version === 'number' ? ` (V${c.version})` : ''}` }));
                setAllCourses(options);
              } catch {}
            }}
          >Настройки</button>
        )}
      </div>

      {activeTab === 'modules' ? (
        <Card
          title="Модули курса"
          actions={
            <div className="flex items-center gap-3">
              {isOrdering && user?.role === 'ADMIN' && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/70" aria-live="polite">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-r-transparent" />
                  <span>Сохранение…</span>
                </div>
              )}
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-y-auto pr-1 styled-scrollbar">
            <div className="relative">
            {isOrdering && user?.role === 'ADMIN' && (
              <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-sky-400/40" />
            )}
              <div className="grid grid-cols-1 gap-3">
            {modules.map((m) => (
              <div
                key={m.id}
                draggable={user?.role === 'ADMIN'}
                onDragStart={() => { if (user?.role === 'ADMIN') { setDraggingId(m.id); setDragOverId(null); } }}
                onDragOver={(e) => { if (user?.role === 'ADMIN') { e.preventDefault(); if (dragOverId !== m.id) setDragOverId(m.id); } }}
                onDragLeave={() => { if (user?.role === 'ADMIN' && dragOverId === m.id) setDragOverId(null); }}
                onDragEnd={() => { if (user?.role === 'ADMIN') { setDraggingId(null); setDragOverId(null); } }}
                onDrop={() => { if (user?.role === 'ADMIN' && (version ?? 0) === 0) { void handleDropReorder(m.id); } setDragOverId(null); }}
                className={`rounded border p-3 transition-colors ${draggingId === m.id ? 'opacity-70' : ''} ${dragOverId === m.id ? 'border-sky-400 ring-2 ring-sky-200 dark:ring-sky-500/30' : 'border-black/10 dark:border-white/10'} ${(version ?? 0) > 0 ? 'cursor-not-allowed' : ''} ${user?.role !== 'ADMIN' ? 'cursor-default' : ''} flex h-full flex-col`}
                title={(version ?? 0) > 0 ? 'Редактирование заблокировано для зафиксированных версий' : user?.role === 'ADMIN' ? 'Перетащите для изменения порядка' : 'Просмотр модуля'}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className={`select-none text-gray-400 ${user?.role === 'ADMIN' ? (draggingId ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}>⋮⋮</span>
                    {editingId === m.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveEditModule(m.id); } if (e.key === 'Escape') { e.preventDefault(); cancelEditModule(); } }}
                        className="w-full flex-1 min-w-0 rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm font-semibold outline-none focus:border-sky-500 dark:border-white/10 dark:text-white"
                        placeholder="Заголовок модуля"
                        disabled={user?.role !== 'ADMIN'}
                      />
                    ) : (
                      <div className="font-semibold" title={m.title} style={{ display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{m.orderIndex}. {m.title}</div>
                    )}
                  </div>
                  {user?.role === 'ADMIN' && (version ?? 0) === 0 && (
                    <div data-module-menu className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === m.id ? null : m.id); }}
                        className="rounded p-1 text-gray-600 hover:bg-black/5 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:text-white/70 dark:hover:bg-white/10"
                        aria-label="Действия модуля"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                      {menuOpenId === m.id && (
                        <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-md border border-black/10 bg-white py-1 shadow-lg ring-1 ring-black/10 dark:border-white/10 dark:bg-neutral-900 dark:ring-white/10">
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                            onClick={() => startEditModule(m)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                            <span>Редактировать</span>
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            onClick={() => confirmDeleteModule(m.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            <span>Удалить</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {editingId === m.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Короткое описание"
                      className="min-h-[60px] w-full rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-sky-500 dark:border-white/10 dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => saveEditModule(m.id)} disabled={user?.role !== 'ADMIN'}>Сохранить</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEditModule}>Отмена</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-white/70" style={{ display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{m.description}</div>
                )}
                <div className="flex-1" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap rounded-full bg-black/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80">Уроков: {m._count?.lessons ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === m.id ? null : (
                      user?.role === 'ADMIN' ? (
                        <Link to={`/admin/chapters/${m.id}`}>
                          <Button disabled={isOrdering && user?.role === 'ADMIN'}>Открыть модуль</Button>
                        </Link>
                      ) : (
                        <Link to={`/chapters/${m.id}`}>
                          <Button>Изучить модуль</Button>
                        </Link>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            {creatingModule && (
              <div className="rounded border-2 border-dashed border-sky-400/60 p-3">
                <div className="text-xs uppercase text-sky-600 dark:text-sky-300">Новый модуль</div>
                <div className="mt-2 space-y-2">
                  <input
                    ref={createTitleRef}
                    value={creatingModule.title}
                    onChange={(e) => user?.role === 'ADMIN' && setCreatingModule({ ...creatingModule, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (creatingModule.title || '').trim() && user?.role === 'ADMIN') {
                        e.preventDefault();
                        void saveNewModule();
                      }
                    }}
                    placeholder="Заголовок модуля"
                    className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-sky-500 dark:border-white/10 dark:text-white"
                    disabled={user?.role !== 'ADMIN'}
                  />
                  <textarea
                    value={creatingModule.description}
                    onChange={(e) => user?.role === 'ADMIN' && setCreatingModule({ ...creatingModule, description: e.target.value })}
                    placeholder="Короткое описание"
                    className="min-h-[60px] w-full rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-sky-500 dark:border-white/10 dark:text-white"
                    disabled={user?.role !== 'ADMIN'}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={saveNewModule} disabled={!creatingModule.title.trim() || user?.role !== 'ADMIN'}>Создать</Button>
                    <Button size="sm" variant="secondary" onClick={() => user?.role === 'ADMIN' && setCreatingModule(null)}>Отмена</Button>
                  </div>
                </div>
              </div>
            )}
              {!creatingModule && user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setCreatingModule({ title: '', description: '' })}
                  className="w-full rounded-lg border-2 border-dashed border-black/20 py-5 text-sm font-medium text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Добавить модуль
                  </span>
                </button>
              )}
              </div>
            </div>
          </div>
        </Card>
      ) : activeTab === 'participants' ? (
        <Card
          title="Участники курса"
          actions={
            participantsLocked
              ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  Изменение участников недоступно
                </span>
              )
              : undefined
          }
        >
          <div className="max-h-[70vh] overflow-y-auto pr-1 styled-scrollbar">
            <div className="grid grid-cols-1 gap-3">
            <div>
              <Input
                label="Добавить участника"
                placeholder="Поиск по ФИО или email"
                value={uq}
                onChange={(e) => setUq(e.target.value)}
                disabled={participantsLocked}
              />
              {uq && !participantsLocked && (
                <div className="mt-2 rounded border border-black/10 p-2 dark:border-white/10">
                  {userOptions.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-white/70">Ничего не найдено</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {userOptions.map((u) => (
                        <div key={u.id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{u.fullName}</div>
                            <div className="text-sm text-gray-600 dark:text-white/70">{u.email}</div>
                          </div>
                          <button
                            onClick={() => addParticipant(u.id)}
                            disabled={isParticipant(u.id) || participantsLocked}
                            className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isParticipant(u.id) ? 'Уже добавлен' : 'Добавить'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium">Текущие участники</div>
              <div className="mt-2 flex flex-col gap-2">
                {participants.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-white/70">Пока нет участников</div>
                ) : (
                  participants.map((p) => (
                    <div key={p.user.id} className="flex items-center justify-between rounded border border-black/10 p-2 dark:border-white/10">
                      <div>
                        <div className="font-medium">{p.user.fullName}</div>
                        <div className="text-sm text-gray-600 dark:text-white/70">{p.user.email}</div>
                      </div>
                      <button
                        onClick={() => removeParticipant(p.user.id)}
                        aria-label="Удалить участника"
                        className="p-1 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 rounded focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                        title="Удалить участника"
                        disabled={participantsLocked}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Настройки курса">
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-sm font-medium">Пререквизиты курса</div>
              <div className="text-xs text-gray-600 dark:text-white/70">Укажите курсы, которые сотрудник должен завершить, прежде чем начать этот курс.</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {allCourses.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-white/70">Список курсов загружается или пуст.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {allCourses
                      .filter((c) => c.id !== courseId)
                      .map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={prereqIds.includes(c.id)}
                            onChange={(e) => {
                              setPrereqIds((prev) => e.target.checked ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id));
                            }}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span>{c.title}</span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      await api.post(`/courses/${courseId}/prerequisites`, { requiredCourseIds: prereqIds });
                      push({ type: 'success', title: 'Пререквизиты сохранены' });
                    } catch {
                      push({ type: 'error', title: 'Не удалось сохранить пререквизиты' });
                    }
                  }}
                >Сохранить</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Удалить модуль?"
        description="Это действие нельзя отменить. Все уроки и контент внутри модуля также будут удалены."
        variant="danger"
        confirmText="Удалить"
        cancelText="Отмена"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => { if (confirmDeleteId) { await deleteModule(confirmDeleteId); } }}
      />
    </div>
  );
}


