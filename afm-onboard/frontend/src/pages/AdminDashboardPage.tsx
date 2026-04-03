import { useEffect, useState } from 'react';
import api from '../lib/api';
import Card from '../components/ui/Card';

type Overview = {
  users: { total: number; approved: number; pending: number; rejected: number };
  attempts: { total: number; passed: number; failed: number; passRate: number; avgScore: number };
  perChapter: { chapterId: string; orderIndex: number; title: string; attemptsTotal: number; attemptsPassed: number; avgScore: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resp = await api.get('/admin/reports/overview');
        setData(resp.data as Overview);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-gray-600 dark:text-white/80">Загрузка...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Пользователи">
          <div className="grid grid-cols-2 gap-3 text-gray-900 dark:text-white/90">
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Всего</div>
              <div className="text-2xl font-semibold">{data.users.total}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Одобрено</div>
              <div className="text-2xl font-semibold">{data.users.approved}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Ожидают</div>
              <div className="text-2xl font-semibold">{data.users.pending}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Отклонено</div>
              <div className="text-2xl font-semibold">{data.users.rejected}</div>
            </div>
          </div>
        </Card>
        <Card title="Попытки тестов">
          <div className="grid grid-cols-2 gap-3 text-gray-900 dark:text-white/90">
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Всего</div>
              <div className="text-2xl font-semibold">{data.attempts.total}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Pass rate</div>
              <div className="text-2xl font-semibold">{data.attempts.passRate}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Пройдено</div>
              <div className="text-2xl font-semibold">{data.attempts.passed}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-white/60">Средний балл</div>
              <div className="text-2xl font-semibold">{data.attempts.avgScore}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Разрез по главам">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm text-gray-900 dark:text-white/90">
            <thead className="text-gray-600 dark:text-white/60">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Глава</th>
                <th className="px-2 py-2">Попыток</th>
                <th className="px-2 py-2">Пройдено</th>
                <th className="px-2 py-2">Средний балл</th>
              </tr>
            </thead>
            <tbody>
              {data.perChapter.map((c) => (
                <tr key={c.chapterId} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-2 py-2">{c.orderIndex}</td>
                  <td className="px-2 py-2">{c.title}</td>
                  <td className="px-2 py-2">{c.attemptsTotal}</td>
                  <td className="px-2 py-2">{c.attemptsPassed}</td>
                  <td className="px-2 py-2">{c.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


