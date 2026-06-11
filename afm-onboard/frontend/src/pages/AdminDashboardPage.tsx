import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

type Overview = {
  users: { total: number; approved: number; pending: number; rejected: number };
  attempts: { total: number; passed: number; failed: number; passRate: number; avgScore: number };
  perChapter: { chapterId: string; orderIndex: number; title: string; attemptsTotal: number; attemptsPassed: number; avgScore: number }[];
};

type StudentAttempt = {
  status: string; score: number | null; startedAt: string;
  chapterTitle: string | null; chapterOrder: number | null;
};

type Student = {
  id: string; fullName: string; email: string; position: string;
  joinedAt: string; totalAttempts: number; passedAttempts: number;
  passRate: number | null; avgScore: number | null;
  lastActivity: string | null; completedLessons: number;
  attempts: StudentAttempt[];
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-white/40">—</span>;
  const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
  return <span className={`font-semibold ${color}`}>{score}%</span>;
}

function StatusBadge({ passed, total }: { passed: number; total: number }) {
  if (total === 0) return <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">Нет попыток</span>;
  const rate = Math.round((passed / total) * 100);
  const color = rate >= 70 ? 'bg-emerald-500/20 text-emerald-300' : rate >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{rate}% пройдено</span>;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attempts' | 'activity'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    (async () => {
      try {
        const [ov, st] = await Promise.all([
          api.get('/admin/reports/overview').then((r) => r.data),
          api.get('/admin/reports/students').then((r) => r.data),
        ]);
        setOverview(ov);
        setStudents(st);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const filtered = students
    .filter((s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.position.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let v = 0;
      if (sortBy === 'name') v = a.fullName.localeCompare(b.fullName);
      else if (sortBy === 'score') v = (a.avgScore ?? -1) - (b.avgScore ?? -1);
      else if (sortBy === 'attempts') v = a.totalAttempts - b.totalAttempts;
      else if (sortBy === 'activity') v = (a.lastActivity ?? '').localeCompare(b.lastActivity ?? '');
      return sortDir === 'asc' ? v : -v;
    });

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-1 text-white/40">
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  if (loading) return <div className="text-white/70 p-6">Загрузка...</div>;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Студентов', value: overview.users.approved, sub: `${overview.users.pending} ожидают`, color: 'from-sky-600 to-blue-700' },
            { label: 'Попыток тестов', value: overview.attempts.total, sub: `${overview.attempts.passed} пройдено`, color: 'from-indigo-600 to-violet-700' },
            { label: 'Pass rate', value: `${overview.attempts.passRate}%`, sub: 'от всех попыток', color: overview.attempts.passRate >= 70 ? 'from-emerald-600 to-teal-700' : 'from-amber-600 to-orange-700' },
            { label: 'Средний балл', value: `${overview.attempts.avgScore}%`, sub: 'по всем тестам', color: overview.attempts.avgScore >= 70 ? 'from-emerald-600 to-teal-700' : 'from-rose-600 to-red-700' },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl bg-gradient-to-br ${k.color} p-4 text-white`}>
              <div className="text-xs font-medium text-white/70 mb-1">{k.label}</div>
              <div className="text-3xl font-bold">{k.value}</div>
              <div className="text-xs text-white/60 mt-1">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Students table */}
      <Card title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Прогресс студентов</span>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Поиск по имени, email, должности…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      }>
        {filtered.length === 0 ? (
          <div className="text-white/50 text-sm py-4 text-center">Студентов не найдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm text-left">
              <thead>
                <tr className="text-white/50 text-xs border-b border-white/10">
                  <th className="px-3 py-2 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                    Студент <SortIcon col="name" />
                  </th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Должность</th>
                  <th className="px-3 py-2 cursor-pointer hover:text-white" onClick={() => toggleSort('attempts')}>
                    Попытки <SortIcon col="attempts" />
                  </th>
                  <th className="px-3 py-2 cursor-pointer hover:text-white" onClick={() => toggleSort('score')}>
                    Ср. балл <SortIcon col="score" />
                  </th>
                  <th className="px-3 py-2">Прогресс</th>
                  <th className="px-3 py-2 cursor-pointer hover:text-white" onClick={() => toggleSort('activity')}>
                    Активность <SortIcon col="activity" />
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <>
                    <tr
                      key={s.id}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <span className="font-medium text-white">{s.fullName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white/70">{s.email}</td>
                      <td className="px-3 py-3 text-white/70 max-w-[140px] truncate">{s.position || '—'}</td>
                      <td className="px-3 py-3">
                        <StatusBadge passed={s.passedAttempts} total={s.totalAttempts} />
                      </td>
                      <td className="px-3 py-3">
                        <ScoreBadge score={s.avgScore} />
                      </td>
                      <td className="px-3 py-3 text-white/70">
                        {s.completedLessons > 0 ? `${s.completedLessons} уроков` : '—'}
                      </td>
                      <td className="px-3 py-3 text-white/50 text-xs">
                        {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('ru') : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${s.id}`); }}
                            className="text-xs text-sky-400 hover:text-sky-300"
                          >
                            Профиль
                          </button>
                          <span className="text-white/20">|</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(expanded === s.id ? null : s.id); }}
                            className="text-xs text-white/50 hover:text-white"
                          >
                            {expanded === s.id ? 'Скрыть' : 'Детали'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === s.id && (
                      <tr key={`${s.id}-exp`} className="bg-white/[0.02]">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">История попыток</div>
                          {s.attempts.length === 0 ? (
                            <div className="text-white/40 text-sm">Нет попыток</div>
                          ) : (
                            <div className="space-y-1">
                              {s.attempts.map((a, i) => (
                                <div key={i} className="flex items-center gap-4 text-sm">
                                  <span className={`w-16 text-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-300' : a.status === 'FAILED' ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white/50'}`}>
                                    {a.status === 'PASSED' ? 'Сдал' : a.status === 'FAILED' ? 'Не сдал' : 'В процессе'}
                                  </span>
                                  <span className="text-white/70">{a.chapterTitle ?? 'Урок'}</span>
                                  <ScoreBadge score={a.score} />
                                  <span className="text-white/40 text-xs ml-auto">
                                    {new Date(a.startedAt).toLocaleString('ru')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Per-chapter breakdown */}
      {overview && overview.perChapter.length > 0 && (
        <Card title="Разрез по модулям">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm text-left">
              <thead>
                <tr className="text-white/50 text-xs border-b border-white/10">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Модуль</th>
                  <th className="px-3 py-2">Попыток</th>
                  <th className="px-3 py-2">Пройдено</th>
                  <th className="px-3 py-2">Pass rate</th>
                  <th className="px-3 py-2">Средний балл</th>
                </tr>
              </thead>
              <tbody>
                {overview.perChapter.map((c) => {
                  const rate = c.attemptsTotal > 0 ? Math.round((c.attemptsPassed / c.attemptsTotal) * 100) : 0;
                  return (
                    <tr key={c.chapterId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-white/50">{c.orderIndex}</td>
                      <td className="px-3 py-2 text-white">{c.title}</td>
                      <td className="px-3 py-2 text-white/70">{c.attemptsTotal}</td>
                      <td className="px-3 py-2 text-white/70">{c.attemptsPassed}</td>
                      <td className="px-3 py-2"><ScoreBadge score={rate} /></td>
                      <td className="px-3 py-2"><ScoreBadge score={c.avgScore} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
