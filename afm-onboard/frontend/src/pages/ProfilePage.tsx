import { useEffect, useState } from 'react';
import api from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toaster';

type Profile = {
  id: string;
  fullName: string;
  position: string;
  birthDate: string; // ISO
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<{ fullName: string; position: string; birthDate: string; email: string }>(
    { fullName: '', position: '', birthDate: '', email: '' },
  );
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/me');
        setProfile(data);
        setForm({
          fullName: data.fullName,
          position: data.position,
          birthDate: data.birthDate?.slice(0, 10) ?? '',
          email: data.email,
        });
      } catch (e: any) {
        push({ type: 'error', title: 'Не удалось загрузить профиль' });
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/me', form);
      setProfile(data);
      push({ type: 'success', title: 'Профиль обновлён' });
    } catch (e: any) {
      push({ type: 'error', title: 'Ошибка сохранения профиля' });
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!pwd.newPassword || pwd.newPassword.length < 12) {
      push({ type: 'error', title: 'Пароль слишком короткий', description: 'Минимум 12 символов' });
      return;
    }
    if (pwd.newPassword !== pwd.confirmNew) {
      push({ type: 'error', title: 'Пароли не совпадают' });
      return;
    }
    try {
      await api.patch('/me/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setPwd({ currentPassword: '', newPassword: '', confirmNew: '' });
      push({ type: 'success', title: 'Пароль обновлён' });
    } catch (e: any) {
      push({ type: 'error', title: 'Не удалось сменить пароль' });
    }
  };

  if (loading) return <div>Загрузка…</div>;
  if (!profile) return <div>Профиль недоступен</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Профиль</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">ФИО</span>
          <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Должность</span>
          <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Дата рождения</span>
          <Input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Email</span>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onSave} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
        <div className="text-sm text-gray-600 dark:text-white/70">Роль: {profile.role}, Статус: {profile.status}</div>
      </div>

      <hr className="my-8 border-black/10 dark:border-white/10" />
      <h2 className="mb-4 text-xl font-semibold">Смена пароля</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Текущий пароль</span>
          <Input type="password" value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Новый пароль</span>
          <Input type="password" value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 dark:text-white/70">Подтверждение</span>
          <Input type="password" value={pwd.confirmNew} onChange={(e) => setPwd((p) => ({ ...p, confirmNew: e.target.value }))} />
        </label>
      </div>
      <div className="mt-4">
        <Button variant="secondary" onClick={onChangePassword}>Обновить пароль</Button>
      </div>
    </div>
  );
}


