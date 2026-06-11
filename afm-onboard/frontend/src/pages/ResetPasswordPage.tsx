import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Ссылка недействительна или устарела');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="text-lg font-semibold">Неверная ссылка</div>
          <Link to="/login" className="text-sky-300 underline">Войти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(2,6,23,0.9),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(30,58,138,0.25),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(8,47,73,0.35),transparent_40%)]" />
      </div>

      <div className="mx-auto w-full max-w-md px-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="text-[11px] tracking-[0.35em] text-white/70">QARJILYQ MONITORING AGENTTIGI</div>
        </div>

        <div className="glass rounded-2xl p-5">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">✅</div>
              <div className="text-lg font-semibold text-white">Пароль изменён!</div>
              <div className="text-sm text-white/70">Перенаправляем на страницу входа…</div>
              <Link to="/login" className="block text-sm text-sky-300 underline hover:text-sky-200">
                Войти сейчас
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 text-center text-lg font-semibold text-white">Новый пароль</div>
              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="Новый пароль"
                  type="password"
                  withPasswordToggle
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Input
                  label="Повторите пароль"
                  type="password"
                  withPasswordToggle
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {error && <div className="text-sm text-rose-400">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Сохранение…' : 'Сохранить пароль'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
