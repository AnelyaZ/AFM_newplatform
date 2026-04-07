import { useEffect, useState } from 'react';
import api from '../lib/api';
import CourseCard from '../components/CourseCard';
import { useAuthStore } from '../store/auth';

type Course = {
  id: string;
  title: string;
  description?: string | null;
  version?: number | null;
  isPublic?: boolean | null;
  progressPercent?: number | null;
  avgScore?: number | null;
};

export default function ChaptersPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, meRes] = await Promise.all([
          api.get('/courses'),
          api.get('/me'),
        ]);
        setCourses(coursesRes.data);
        setFullName(meRes.data.fullName || '');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstName = fullName.split(' ')[0] || 'Студент';
  const completedCourses = courses.filter((c) => (c.progressPercent ?? 0) >= 100).length;
  const inProgressCourses = courses.filter((c) => (c.progressPercent ?? 0) > 0 && (c.progressPercent ?? 0) < 100).length;
  const avgScore = courses.length > 0
    ? Math.round(courses.filter((c) => c.avgScore).reduce((sum, c) => sum + (c.avgScore ?? 0), 0) / (courses.filter((c) => c.avgScore).length || 1))
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-gray-500 dark:text-white/60">Загрузка...</div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="glass rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-white/50 uppercase tracking-widest mb-1">
            {getGreeting()}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
            Продолжайте обучение — вы на верном пути!
          </p>
        </div>
        <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-3xl flex-shrink-0">
          🎓
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Всего курсов</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{courses.length}</div>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500 dark:text-white/50 mb-1">В процессе</div>
          <div className="text-2xl font-semibold text-sky-600 dark:text-sky-400">{inProgressCourses}</div>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Завершено</div>
          <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{completedCourses}</div>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Средний балл</div>
          <div className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {avgScore > 0 ? `${avgScore}%` : '—'}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      {courses.length > 0 && (
        <div className="glass rounded-xl px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white/80">Общий прогресс обучения</span>
            <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
              {Math.round(courses.reduce((sum, c) => sum + (c.progressPercent ?? 0), 0) / courses.length)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${Math.round(courses.reduce((sum, c) => sum + (c.progressPercent ?? 0), 0) / courses.length)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400 dark:text-white/40">
            {completedCourses} из {courses.length} курсов завершено
          </div>
        </div>
      )}

      {/* Courses Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Мои курсы</h2>
          <span className="text-xs text-gray-500 dark:text-white/50">{courses.length} курсов доступно</span>
        </div>

        {courses.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center">
            <div className="text-4xl mb-3">📚</div>
            <div className="text-gray-500 dark:text-white/60 text-sm">Курсы пока не назначены</div>
            <div className="text-gray-400 dark:text-white/40 text-xs mt-1">Обратитесь к администратору</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description ?? '',
                  version: course.version ?? null,
                  isPublic: course.isPublic ?? null,
                  progressPercent: course.progressPercent ?? null,
                  avgScore: course.avgScore ?? null,
                }}
                onOpen={(id) => (window.location.href = `/kursy/${id}`)}
                publicLabel="по умолчанию"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


