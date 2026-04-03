import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { BookOpen, BarChart3, ClipboardCheck, User as UserIcon, Shield, X } from 'lucide-react';

export function NavIcon({ name, active }: { name: 'learn' | 'progress' | 'tests' | 'profile' | 'admin'; active?: boolean }) {
  const color = active ? 'text-sky-500 dark:text-sky-400' : 'text-gray-500 dark:text-white/60';
  const common = { size: 22, className: color } as const;
  switch (name) {
    case 'learn':
      return <BookOpen {...common} />;
    case 'progress':
      return <BarChart3 {...common} />;
    case 'tests':
      return <ClipboardCheck {...common} />;
    case 'profile':
      return <UserIcon {...common} />;
    case 'admin':
      return <Shield {...common} />;
  }
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [adminOpen, setAdminOpen] = useState(false);

  const isActive = (to: string) => pathname === to;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
            <div className="mx-auto max-w-5xl px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="glass flex items-stretch justify-between gap-1 rounded-t-xl border border-black/10 p-1 dark:border-white/10">
            <Link to="/" className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs">
              <NavIcon name="learn" active={isActive('/')} />
              <span className={isActive('/') ? 'text-sky-600 dark:text-sky-300' : 'text-gray-700 dark:text-white/70'}>Обучение</span>
            </Link>
            
            <Link to="/profile" className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs">
              <NavIcon name="profile" active={isActive('/profile')} />
              <span className={isActive('/profile') ? 'text-sky-600 dark:text-sky-300' : 'text-gray-700 dark:text-white/70'}>Профиль</span>
            </Link>
            {isAdmin && (
              <button onClick={() => setAdminOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs">
                <NavIcon name="admin" active={adminOpen} />
                <span className="text-gray-600 dark:text-white/70">Админ</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Sheet for Admin */}
      {isAdmin && (
        <div className={`fixed inset-0 z-30 md:hidden ${adminOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!adminOpen}>
          <div className={`absolute inset-0 bg-black/50 transition-opacity ${adminOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setAdminOpen(false)} />
          <div className={`absolute bottom-0 left-0 right-0 transform transition-transform duration-200 ${adminOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="mx-auto max-w-5xl px-2 pb-[env(safe-area-inset-bottom)]">
              <div className="glass rounded-t-2xl border border-black/10 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Администрирование</div>
                  <button className="rounded p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Закрыть" onClick={() => setAdminOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/admin/dashboard" onClick={() => setAdminOpen(false)} className="rounded border border-black/10 p-3 text-center text-sm dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">Дашборд</Link>
                  <Link to="/admin/users" onClick={() => setAdminOpen(false)} className="rounded border border-black/10 p-3 text-center text-sm dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">Пользователи</Link>
                  <Link to="/admin/courses" onClick={() => setAdminOpen(false)} className="rounded border border-black/10 p-3 text-center text-sm dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">Создание курсов</Link>
                  <Link to="/admin/chapters" onClick={() => setAdminOpen(false)} className="rounded border border-black/10 p-3 text-center text-sm dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">Тесты</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


