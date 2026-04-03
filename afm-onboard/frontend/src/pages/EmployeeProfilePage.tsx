import { useAuthStore } from '../store/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { toMediaUrl } from '../lib/media';

export default function EmployeeProfilePage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Профиль</h2>
        <div className="text-sm text-gray-600 dark:text-white/70">Информация об аккаунте и выход из системы.</div>
      </div>
      <Card>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {(user as any)?.avatarKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="avatar" src={toMediaUrl((user as any).avatarKey)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-500">Нет фото</div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div><span className="text-gray-600 dark:text-white/60">ФИО:</span> <span className="font-medium">{(user as any)?.fullName}</span></div>
            <div><span className="text-gray-600 dark:text-white/60">Роль:</span> <span className="font-medium">{user?.role}</span></div>
            <div><span className="text-gray-600 dark:text-white/60">Статус:</span> <span className="font-medium">{(user as any)?.status}</span></div>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={logout}>Выйти</Button>
        </div>
      </Card>
    </div>
  );
}


