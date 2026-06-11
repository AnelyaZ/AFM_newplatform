import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📧</div>
              <div className="text-lg font-semibold text-white">Письмо отправлено</div>
              <div className="text-sm text-white/70">
                Если аккаунт с адресом <span className="text-white font-medium">{email}</span> существует,
                вы получите письмо со ссылкой для сброса пароля. Проверьте папку «Спам», если письмо не пришло.
              </div>
              <Link to="/login" className="block text-sm text-sky-300 underline hover:text-sky-200">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 text-center text-lg font-semibold text-white">Забыли пароль?</div>
              <div className="mb-4 text-center text-sm text-white/70">
                Введите ваш email — мы отправим ссылку для сброса пароля.
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <div className="text-sm text-rose-400">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Отправка…' : 'Отправить ссылку'}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-white/70">
                <Link className="text-sky-300 underline hover:text-sky-200" to="/login">
                  Вернуться ко входу
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
