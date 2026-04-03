import { useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import { useToast } from '../components/Toaster';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { push } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      if (data.user?.mustChangePassword) {
        push({ type: 'info', title: 'Требуется смена пароля' });
        navigate('/first-login');
      } else {
      push({ type: 'success', title: 'Добро пожаловать!' });
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Ошибка входа');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Фон: светлый и тёмный варианты */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Тёмная тема */}
        <div className="absolute inset-0 hidden dark:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(2,6,23,0.9),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(30,58,138,0.25),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(8,47,73,0.35),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(0,0,0,0.2),transparent_30%),linear-gradient(to_top_left,rgba(255,255,255,0.03),transparent_30%)]" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>
        {/* Светлая тема */}
        <div className="absolute inset-0 block dark:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_20%_20%,rgba(14,165,233,0.12),transparent_70%),radial-gradient(600px_300px_at_80%_30%,rgba(99,102,241,0.1),transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(0,0,0,0.02),transparent_30%)]" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4">
        {/* Брендинг АФМ */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="text-[11px] tracking-[0.35em] text-gray-500 dark:text-white/70">QARJILYQ MONITORING AGENTTIGI</div>
          {/* Заголовок с названием убран по просьбе: оставляем только форму входа */}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">Вход в систему</div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <Input label="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} type="password" withPasswordToggle required />
            {error && <div className="text-sm text-rose-400">{error}</div>}
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-white/70">
            Нет аккаунта? <Link className="text-sky-600 underline hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200" to="/register">Регистрация</Link>
          </p>
        </div>

        <div className="pointer-events-none mt-6 select-none text-center text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/40">
          © AFM · Безопасный доступ · Конфиденциально
        </div>
      </div>
    </div>
  );
}


