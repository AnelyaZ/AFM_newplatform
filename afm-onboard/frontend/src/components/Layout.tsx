import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import BottomNav, { NavIcon } from './BottomNav';
import Breadcrumbs from './Breadcrumbs';
import Logo from './Logo';
import api from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [fullName, setFullName] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user) return;
        const { data } = await api.get('/me');
        if (mounted) setFullName(data.fullName || '');
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'U';

  // const isActive = (path: string) => (location.pathname === path ? 'bg-sky-50 text-sky-700 dark:bg-white/10 dark:text-sky-300' : 'text-gray-800 dark:text-white/80');

  return (
    <div className="relative min-h-screen">
      <div className="app-bg" />

      {/* Десктопный сайдбар */}
      <aside className="glass fixed inset-y-0 left-0 z-10 hidden w-[260px] md:block">
        <div className="flex items-center gap-2 border-b border-black/10 px-4 py-4 dark:border-white/10">
          <Logo size="sm" showText={false} />
          <div className="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-100">AFM Learning</div>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          <Link to="/" className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center align-middle">
              <NavIcon name="learn" active={location.pathname === '/'} />
            </span>
            <span>Обучение</span>
          </Link>
          
          {user?.role === 'ADMIN' && (
            <>
              <div className="mt-3 sidebar-section-label">Администрирование</div>
              <Link to="/admin/dashboard" className={`sidebar-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>Дашборд</Link>
              <Link to="/admin/courses" className={`sidebar-link ${location.pathname.startsWith('/admin/courses') ? 'active' : ''}`}>Создание курсов</Link>
              <Link to="/admin/users" className={`sidebar-link ${location.pathname === '/admin/users' ? 'active' : ''}`}>Пользователи</Link>
              <Link to="/admin/settings" className={`sidebar-link ${location.pathname === '/admin/settings' ? 'active' : ''}`}>Настройки системы</Link>
            </>
          )}
        </nav>
      </aside>

      {/* Мобильный сайдбар удалён: используем нижнюю навигацию */}

      {/* Фиксированная верхняя панель */}
      <header className="glass fixed top-0 left-0 right-0 z-10 h-16 flex items-center justify-between border-b border-black/10 px-4 sm:px-5 md:left-[260px] dark:border-white/10">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} className="md:hidden" />
          <div className="hidden text-sm uppercase tracking-widest text-gray-700 dark:text-gray-300 sm:block">Панель обучения АФМ</div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left text-sm sm:block">
                  <div className="leading-4 text-gray-900 dark:text-gray-100 max-w-[180px] truncate">{fullName || 'Пользователь'}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{user.role}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
                {menuOpen && (
                <div role="menu" className="glass absolute right-0 z-20 mt-2 min-w-[220px] max-w-[90vw] overflow-hidden rounded-md border border-black/10 shadow-xl dark:border-white/10">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{fullName || 'Пользователь'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{user.role}</div>
                  </div>
                  <div className="h-px bg-black/10 dark:bg-white/10" />
                  <Link
                    role="menuitem"
                    to="/profile"
                    className="block px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    Открыть профиль
                  </Link>
                  <button
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Контент: смещения под фиксированные панели + внутренние отступы секции */}
      <main className="pt-16 pb-20 md:pl-[260px] md:pb-0">
        <div className="px-4 py-6 sm:px-6 md:p-8">
          <div className="mx-auto w-full max-w-7xl xl:max-w-6xl 2xl:max-w-5xl">
          <Breadcrumbs />
          {children}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}


