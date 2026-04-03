import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/api';
import { useToast } from '../components/Toaster';

export default function AdminSettingsPage() {
  const [registrationCode, setRegistrationCode] = useState('');
  const [mailFromName, setMailFromName] = useState('');
  const [mailFromEmail, setMailFromEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/settings');
        setRegistrationCode(data.registrationCode || '');
        setMailFromName(data.mailFromName || '');
        setMailFromEmail(data.mailFromEmail || '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.patch('/admin/settings', { registrationCode, mailFromName, mailFromEmail });
    push({ type: 'success', title: 'Настройки сохранены' });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Настройки системы</h2>
      <Card>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2 max-w-xs">
            <Input
              label="Код регистрации (4 цифры)"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              required
            />
            <div className="mt-1 text-xs text-gray-600 dark:text-white/60">Используется при подаче заявки на регистрацию.</div>
          </div>
          <Input
            label="Имя отправителя писем"
            value={mailFromName}
            onChange={(e) => setMailFromName(e.target.value)}
            placeholder="AFM Learning"
            className="md:col-span-2"
          />
          <Input
            label="Email отправителя"
            value={mailFromEmail}
            onChange={(e) => setMailFromEmail(e.target.value)}
            type="email"
            placeholder="no-reply@afm.kz"
            className="md:col-span-2 max-w-md"
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading}>Сохранить</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


