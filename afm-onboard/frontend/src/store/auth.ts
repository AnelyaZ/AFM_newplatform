import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = { id: string; role: 'ADMIN' | 'EMPLOYEE'; status: string; mustChangePassword?: boolean } | null;

type AuthState = {
  user: User;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (payload: { user: User; accessToken: string; refreshToken: string }) => void;
  setTokens: (payload: { accessToken: string; refreshToken: string | null }) => void;
  logout: () => void;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setHydrated: (v: boolean) => set({ hydrated: v }),
      setAuth: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      setTokens: ({ accessToken, refreshToken }) =>
        set((s) => ({ accessToken, refreshToken: refreshToken ?? s.refreshToken })),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        // mark store as hydrated regardless of success
        state?.setHydrated(true);
      },
    },
  ),
);

// Миграция: удаляем старые данные из localStorage если есть
try {
  const oldAuth = localStorage.getItem('auth');
  if (oldAuth) {
    localStorage.removeItem('auth');
  }
} catch {
  // Игнорируем ошибки
}


