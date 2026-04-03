import { useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { useToast } from '../components/Toaster';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function FirstLoginPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { push } = useToast();
  const logout = useAuthStore((s) => s.logout);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Пароль и подтверждение не совпадают');
      return;
    }
    try {
      await api.patch('/me/password', { currentPassword, newPassword });
      push({ type: 'success', title: 'Пароль обновлён' });
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Не удалось сменить пароль');
    }
  };

  const onCancel = () => {
    // При первом входе запрещаем пропуск — предлагается выйти
    logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto mt-24 max-w-md">
      <Card title="Смена пароля (первый вход)">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Текущий (временный) пароль" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <Input label="Новый пароль" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <Input label="Подтверждение пароля" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Сменить пароль</Button>
            <Button type="button" variant="secondary" onClick={onCancel}>Выйти</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


