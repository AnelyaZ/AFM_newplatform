import { useState } from 'react';
import api from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
// import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import { useToast } from '../components/Toaster';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { push } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      await api.post('/auth/register', { fullName, position, birthDate, email, password, registrationCode });
      setOk('Заявка создана. Ожидайте подтверждения администратора.');
      push({ type: 'success', title: 'Заявка отправлена' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Ошибка регистрации');
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

      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="mt-1 text-2xl font-black tracking-wide text-gray-900 dark:text-white">Регистрация сотрудника</div>
          <div className="text-sm text-gray-600 dark:text-white/70">Заполните форму. Заявка будет отправлена администратору.</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="md:col-span-2" />
            <Input label="Должность" value={position} onChange={(e) => setPosition(e.target.value)} required />
            <Input label="Дата рождения" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" required />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="md:col-span-2" />
            <Input label="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} type="password" withPasswordToggle required className="md:col-span-2" />
            <Input label="Код регистрации" value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} inputMode="numeric" pattern="[0-9]*" required className="md:col-span-2" />
            {error && <div className="md:col-span-2 text-sm text-rose-500 dark:text-rose-400">{error}</div>}
            {ok && <div className="md:col-span-2 text-sm text-green-600 dark:text-green-300">{ok}</div>}
            <div className="md:col-span-2">
              <Button type="submit" className="w-full">Отправить заявку</Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-white/70">
            Уже есть аккаунт? <Link className="text-sky-600 underline hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200" to="/login">Войти</Link>
          </p>
        </div>
        <div className="pointer-events-none mt-6 select-none text-center text-[11px] uppercase tracking-widest text-gray-400 dark:text-white/40">
          © AFM · Безопасный доступ · Конфиденциально
        </div>
      </div>
    </div>
  );
}


