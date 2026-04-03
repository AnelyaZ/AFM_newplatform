import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';

type Crumb = { label: string; to?: string };

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  const baseLearningCrumb: Crumb = { label: 'Обучение', to: '/' };
  const baseAdminCoursesCrumb: Crumb = { label: 'Создание курсов', to: '/admin/courses' };

  const path = location.pathname;

  const back = () => navigate(-1);

  useEffect(() => {
    let active = true;
    const build = async () => {
      try {
        // Admin simple pages
        if (path === '/admin/courses') {
          if (!active) return; setCrumbs([baseAdminCoursesCrumb]); return;
        }
        if (path === '/admin/users') {
          if (!active) return; setCrumbs([{ label: 'Пользователи' }]); return;
        }
        if (path === '/admin/settings') {
          if (!active) return; setCrumbs([{ label: 'Настройки системы' }]); return;
        }
        if (path === '/admin/dashboard') {
          if (!active) return; setCrumbs([{ label: 'Дашборд' }]); return;
        }

        // Learning roots
        if (path === '/') { if (!active) return; setCrumbs([baseLearningCrumb]); return; }
        if (path === '/progress') { if (!active) return; setCrumbs([{ label: 'Прогресс' }]); return; }
        if (path === '/tests') { if (!active) return; setCrumbs([{ label: 'Тесты' }]); return; }
        if (path === '/profile') { if (!active) return; setCrumbs([{ label: 'Профиль' }]); return; }

        // Courses (admin edit)
        const mCourse = path.match(/^\/courses\/([^/]+)$/);
        if (mCourse) {
          const courseId = mCourse[1];
          let courseTitle = 'Курс';
          try {
            const isAdmin = user?.role === 'ADMIN';
            const apiEndpoint = isAdmin ? `/courses/admin/by-id/${courseId}` : `/courses/${courseId}`;
            const { data } = await api.get(apiEndpoint);
            courseTitle = data.title || 'Курс';
          } catch {}
          const base = isAdmin ? baseAdminCoursesCrumb : baseLearningCrumb;
          if (!active) return; setCrumbs([base, { label: `Курс: ${courseTitle}` }]); return;
        }

        // Courses (learning RU path)
        const mCourseRu = path.match(/^\/kursy\/([^/]+)$/);
        if (mCourseRu) {
          const courseId = mCourseRu[1];
          let courseTitle = 'Курс';
          try {
            // Для русских путей всегда используем обычный API (обучение)
            const { data } = await api.get(`/courses/${courseId}`);
            courseTitle = data.title || 'Курс';
          } catch {}
          const base = baseLearningCrumb;
          if (!active) return; setCrumbs([base, { label: `Курс: ${courseTitle}` }]); return;
        }

        // Chapters (learning)
        const mChapter = path.match(/^\/chapters\/([^/]+)(?:\/test)?$/);
        if (mChapter) {
          const chapterId = mChapter[1];
          let chapterTitle = 'Модуль';
          let courseId: string | null = null;
          let courseTitle = 'Курс';
          try {
            const { data } = await api.get(`/chapters/${chapterId}`);
            chapterTitle = data.title || 'Модуль';
            courseId = data.courseId || null;
            if (courseId) {
              try {
                const c = await api.get(`/courses/${courseId}`);
                courseTitle = c.data.title || 'Курс';
              } catch {}
            }
          } catch {}
          const base = baseLearningCrumb;
          const list: Crumb[] = [base];
          if (courseId) list.push({ label: `Курс: ${courseTitle}`, to: `/kursy/${courseId}` });
          list.push({ label: `Модуль: ${chapterTitle}`, to: `/chapters/${chapterId}` });
          if (path.endsWith('/test')) list.push({ label: 'Тест модуля' });
          if (!active) return; setCrumbs(list); return;
        }

        // Chapters (admin)
        const mChapterAdmin = path.match(/^\/admin\/chapters\/([^/]+)(?:\/(?:contents|lessons|test))?$/);
        if (mChapterAdmin) {
          const chapterId = mChapterAdmin[1];
          let chapterTitle = 'Модуль';
          try {
            const { data } = await api.get(`/chapters/${chapterId}`);
            chapterTitle = data.title || 'Модуль';
          } catch {}
          const list: Crumb[] = [baseAdminCoursesCrumb, { label: `Модуль: ${chapterTitle}`, to: `/admin/chapters/${chapterId}` }];
          if (path.endsWith('/contents')) list.push({ label: 'Содержимое' });
          if (path.endsWith('/lessons')) list.push({ label: 'Уроки' });
          if (path.endsWith('/test')) list.push({ label: 'Тест' });
          if (!active) return; setCrumbs(list); return;
        }

        // Lessons
        const mLesson = path.match(/^\/lessons\/([^/]+)(?:\/test)?$/);
        if (mLesson) {
          const lessonId = mLesson[1];
          let lessonOrder: number | null = null;
          let chapterId: string | null = null;
          let chapterTitle = 'Модуль';
          let courseId: string | null = null;
          let courseTitle = 'Курс';
          try {
            const { data: lesson } = await api.get(`/chapters/any/lessons/${lessonId}`);
            lessonOrder = lesson.orderIndex ?? null;
            chapterId = lesson.chapterId ?? null;
            if (chapterId) {
              const { data: ch } = await api.get(`/chapters/${chapterId}`);
              chapterTitle = ch.title || chapterTitle;
              courseId = ch.courseId || null;
              if (courseId) {
                try {
                  const c = await api.get(`/courses/${courseId}`);
                  courseTitle = c.data.title || 'Курс';
                } catch {}
              }
            }
          } catch {}
          const base = baseLearningCrumb;
          const list: Crumb[] = [base];
          if (courseId) list.push({ label: `Курс: ${courseTitle}`, to: `/kursy/${courseId}` });
          if (chapterId) list.push({ label: `Модуль: ${chapterTitle}`, to: `/chapters/${chapterId}` });
          list.push({ label: lessonOrder ? `Урок №${lessonOrder}` : 'Урок' , to: path.endsWith('/test') ? `/lessons/${lessonId}` : undefined });
          if (path.endsWith('/test')) list.push({ label: 'Тест урока' });
          if (!active) return; setCrumbs(list); return;
        }

        // Fallback: split path with RU mapping for known segments
        const ruMap: Record<string, string> = {
          'kursy': 'Курсы',
          'courses': 'Курсы',
          'chapters': 'Модули',
          'lessons': 'Уроки',
          'test': 'Тест',
          'admin': 'Администрирование',
          'users': 'Пользователи',
          'settings': 'Настройки',
          'dashboard': 'Дашборд',
          'profile': 'Профиль',
          'progress': 'Прогресс',
          'tests': 'Тесты'
        };
        const parts = path.split('/').filter(Boolean);
        const acc: Crumb[] = [];
        let running = '';
        for (const p of parts) {
          running += `/${p}`;
          const label = ruMap[p] || decodeURIComponent(p);
          acc.push({ label, to: running });
        }
        if (!active) return; setCrumbs(acc);
      } catch {
        if (!active) return; setCrumbs([]);
      }
    };
    build();
    return () => { active = false; };
  }, [path, isAdmin]);

  const show = useMemo(() => crumbs.length > 0, [crumbs]);
  const canGoBack = useMemo(() => crumbs.length > 1, [crumbs]);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-black/10 bg-white/50 p-2 text-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      {canGoBack && (
        <>
          <button onClick={back} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10">
            <span>←</span>
            <span>Назад</span>
          </button>
          <div className="h-5 w-px bg-black/10 dark:bg-white/10" />
        </>
      )}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, idx) => (
          <span key={`${c.label}-${idx}`} className="flex items-center gap-1">
            {c.to && idx < crumbs.length - 1 ? (
              <Link to={c.to} className="rounded px-1 py-0.5 text-gray-700 hover:bg-black/5 hover:underline dark:text-gray-200 dark:hover:bg-white/10">{c.label}</Link>
            ) : (
              <span className="px-1 py-0.5 text-gray-900 dark:text-white">{c.label}</span>
            )}
            {idx < crumbs.length - 1 && <span className="text-gray-400">›</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}


