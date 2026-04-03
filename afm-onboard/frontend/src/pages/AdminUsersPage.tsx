import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toaster';

type User = { id: string; fullName: string; email: string; role: 'ADMIN'|'EMPLOYEE'; status: 'PENDING'|'APPROVED'|'REJECTED'; createdAt: string };
// type Course = { id: string; title: string };

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [cFullName, setCFullName] = useState('');
  const [cPosition, setCPosition] = useState('');
  const [cBirthDate, setCBirthDate] = useState('');
  const [cEmail, setCEmail] = useState('');
  // Пароль убран: генерируется автоматически и высылается на email
  const [cRole, setCRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  // Настройка доступа перенесена на страницу профиля

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, status, page, limit } });
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Курсы больше не загружаем здесь
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, page, limit]);

  const setStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    await api.patch(`/admin/users/${id}/status`, { status: newStatus });
    push({ type: 'success', title: 'Статус обновлён' });
    await load();
  };
  const setRole = async (id: string, role: 'ADMIN' | 'EMPLOYEE') => {
    await api.patch(`/admin/users/${id}/role`, { role });
    push({ type: 'success', title: 'Роль обновлена' });
    await load();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/users', {
      fullName: cFullName,
      position: cPosition,
      birthDate: cBirthDate,
      email: cEmail,
      role: cRole,
      status: 'APPROVED',
    });
    push({ type: 'success', title: 'Пользователь создан' });
    setCreateOpen(false);
    setCFullName('');
    setCPosition('');
    setCBirthDate('');
    setCEmail('');
    setCRole('EMPLOYEE');
    await load();
  };

  const total = users.length; // Placeholder; ideally backend returns meta
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // const openAccess = () => {};
  // const toggleAccess = () => {};

  

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Пользователи</h2>
          <div className="text-sm text-gray-600 dark:text-white/70">Утверждайте регистрации и управляйте ролями.</div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Input placeholder="Поиск (ФИО/Email)" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            value={status}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'Все статусы' },
              { value: 'PENDING', label: 'PENDING' },
              { value: 'APPROVED', label: 'APPROVED' },
              { value: 'REJECTED', label: 'REJECTED' },
            ]}
          />
          <Select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            options={[
              { value: '10', label: '10 / стр.' },
              { value: '20', label: '20 / стр.' },
              { value: '50', label: '50 / стр.' },
            ]}
          />
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium">Создать пользователя</h3>
          <Button onClick={() => setCreateOpen((v) => !v)}>{createOpen ? 'Скрыть' : 'Открыть'}</Button>
        </div>
        {createOpen && (
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={createUser}>
            <Input required label="ФИО" placeholder="Иванов Иван" value={cFullName} onChange={(e) => setCFullName(e.target.value)} />
            <Input required label="Должность" placeholder="Инспектор" value={cPosition} onChange={(e) => setCPosition(e.target.value)} />
            <Input required type="date" label="Дата рождения" value={cBirthDate} onChange={(e) => setCBirthDate(e.target.value)} />
            <Input required type="email" label="Email" placeholder="user@example.com" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
            <div className="rounded-lg border border-amber-400/40 bg-amber-50/40 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              Временный пароль будет сгенерирован автоматически и отправлен на email пользователя.
            </div>
            <Select
              label="Роль"
              value={cRole}
              onChange={(e) => setCRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
              options={[
                { value: 'EMPLOYEE', label: 'EMPLOYEE' },
                { value: 'ADMIN', label: 'ADMIN' },
              ]}
            />
            <div className="col-span-full mt-2 flex gap-2">
              <Button type="submit" variant="primary">Создать</Button>
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-white/10">
            <thead className="bg-gray-50 text-gray-800 dark:bg-white/5 dark:text-white/90">
              <tr>
                <th className="border border-gray-200 p-2 text-left dark:border-white/10">ФИО</th>
                <th className="border border-gray-200 p-2 text-left dark:border-white/10">Email</th>
                <th className="border border-gray-200 p-2 text-left dark:border-white/10">Роль</th>
                <th className="border border-gray-200 p-2 text-left dark:border-white/10">Статус</th>
                <th className="border border-gray-200 p-2 text-left dark:border-white/10">Действия</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-100">
              {loading ? (
                <tr>
                  <td className="p-4" colSpan={5}>Загрузка...</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-white/5 dark:even:bg-white/10">
                    <td className="border border-gray-200 p-2 dark:border-white/10">{u.fullName}</td>
                    <td className="border border-gray-200 p-2 dark:border-white/10">{u.email}</td>
                    <td className="border border-gray-200 p-2 dark:border-white/10">{u.role}</td>
                    <td className="border border-gray-200 p-2 dark:border-white/10">{u.status}</td>
                    <td className="border border-gray-200 p-2 dark:border-white/10">
                      <div className="flex flex-wrap gap-2">
                        {u.status !== 'APPROVED' && (
                          <Button size="sm" variant="primary" onClick={() => setStatus(u.id, 'APPROVED')}>
                            Утвердить
                          </Button>
                        )}
                        {u.status !== 'REJECTED' && (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(u.id, 'REJECTED')}>
                            Отклонить
                          </Button>
                        )}
                        {u.role !== 'ADMIN' && (
                          <Button size="sm" onClick={() => setRole(u.id, 'ADMIN')}>
                            Сделать админом
                          </Button>
                        )}
                        {u.role !== 'EMPLOYEE' && (
                          <Button size="sm" variant="ghost" onClick={() => setRole(u.id, 'EMPLOYEE')}>
                            Сделать сотрудником
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/users/${u.id}`)}>
                          Открыть профиль
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Настройка доступа к курсам перенесена на страницу профиля пользователя */}
        <div className="mt-4 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-full sm:w-auto">
            Назад
          </Button>
          <div className="text-center text-sm text-gray-600 dark:text-white/70 sm:min-w-[140px]">
            Стр. {page} из {pages}
          </div>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="w-full sm:w-auto">
            Далее
          </Button>
        </div>
      </Card>
    </div>
  );
}


