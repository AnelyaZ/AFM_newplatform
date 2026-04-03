import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toMediaUrl } from '../lib/media';
import { useToast } from '../components/Toaster';

type Profile = {
  user: {
    id: string;
    fullName: string;
    position: string;
    birthDate: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    avatarKey?: string | null;
  };
  stats: { completedChapters: number; averageScore: number };
  courses: { id: string; title: string; description?: string | null }[];
  availableCourses: { id: string; title: string; description?: string | null; isPublic?: boolean }[];
};

export default function AdminUserProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const { push } = useToast();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}/profile`);
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append('file', file);
      const { data: uploaded } = await api.post('/uploads/file', form);
      await api.patch(`/admin/users/${id}`, { avatarKey: uploaded.key });
      push({ type: 'success', title: 'Аватар обновлён' });
      await load();
    } catch {
      push({ type: 'error', title: 'Не удалось загрузить аватар' });
    } finally {
      setAvatarUploading(false);
      e.currentTarget.value = '';
    }
  };

  const toggleCourseAccess = async (courseId: string, hasAccess: boolean) => {
    if (!id) return;
    try {
      if (hasAccess) {
        await api.delete(`/courses/${courseId}/access/${id}`);
      } else {
        await api.post(`/courses/${courseId}/access`, { userId: id });
      }
      await load();
    } catch {
      push({ type: 'error', title: 'Не удалось изменить доступ' });
    }
  };

  const enrolledIds = useMemo(() => new Set((data?.courses || []).map((c) => c.id)), [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Профиль сотрудника</h2>
          <div className="text-sm text-gray-600 dark:text-white/70">Аватар, статистика и доступ к курсам</div>
        </div>
      </div>

      <Card>
        {loading || !data ? (
          <div>Загрузка…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px,1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-40 w-40 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {data.user.avatarKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toMediaUrl(data.user.avatarKey)} className="h-full w-full object-cover" alt="avatar" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">Нет фото</div>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="file" accept="image/*" onChange={onUploadAvatar} disabled={avatarUploading} />
              </label>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="ФИО" value={data.user.fullName} readOnly />
                <Input label="Email" value={data.user.email} readOnly />
                <Input label="Должность" value={data.user.position} readOnly />
                <Input label="Статус" value={data.user.status} readOnly />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card title="Завершено модулей">
                  <div className="text-2xl font-semibold">{data.stats.completedChapters}</div>
                </Card>
                <Card title="Средний балл">
                  <div className="text-2xl font-semibold">{data.stats.averageScore}%</div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </Card>

      {!loading && data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Доступные курсы">
            <div className="space-y-2">
              {data.availableCourses.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-white/70">Нет доступных курсов</div>
              ) : (
                data.availableCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded border border-white/10 p-3">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      {c.description && <div className="text-sm text-gray-600 dark:text-white/70">{c.description}</div>}
                    </div>
                    <div>
                      <Button size="sm" variant={enrolledIds.has(c.id) ? 'secondary' : 'primary'} onClick={() => toggleCourseAccess(c.id, enrolledIds.has(c.id))}>
                        {enrolledIds.has(c.id) ? 'Убрать доступ' : 'Выдать доступ'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Назначенные курсы">
            <div className="space-y-2">
              {data.courses.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-white/70">Пока не назначено</div>
              ) : (
                data.courses.map((c) => (
                  <div key={c.id} className="rounded border border-white/10 p-3">
                    <div className="font-medium">{c.title}</div>
                    {c.description && <div className="text-sm text-gray-600 dark:text-white/70">{c.description}</div>}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


