import axios from 'axios';
import { useAuthStore } from '../store/auth';
import { getApiBaseUrl } from './baseUrl';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight token refresh to avoid race conditions with 401
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshWaiters.push(cb);
}

function notifyRefreshDone(token: string | null) {
  refreshWaiters.forEach((cb) => cb(token));
  refreshWaiters = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    // Don't try to refresh on refresh endpoint itself
    const url: string = original?.url || '';
    const { refreshToken, user } = useAuthStore.getState();

    if (error.response?.status === 401 && !url.includes('/auth/refresh')) {
      // If no refresh available → logout
      if (!refreshToken || !user?.id) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newAccess) => {
            if (!newAccess) {
              reject(error);
              return;
            }
            try {
              original.headers = original.headers || {};
              original.headers.Authorization = `Bearer ${newAccess}`;
              resolve(api.request(original));
            } catch (e) {
              reject(e);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        // Use a bare axios instance to avoid interceptor recursion
        const bare = axios.create({ baseURL: getApiBaseUrl() });
        const resp = await bare.post('/auth/refresh', { userId: user.id, refreshToken });
        const newAccess = resp.data.accessToken as string;
        useAuthStore.getState().setTokens({ accessToken: newAccess, refreshToken });
        notifyRefreshDone(newAccess);
        // Retry original request with new token
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api.request(original);
      } catch (e) {
        notifyRefreshDone(null);
        useAuthStore.getState().logout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    try {
      const silent = error?.config?.headers && (error.config.headers as any)['X-Silent-Error'] === '1';
      if (!silent) {
        const payload = error?.response?.data;
        const statusCode = error?.response?.status;

        let msg: string;

        if (statusCode === 400) {
          // Ошибки валидации - можно показать детали
          msg = (payload && (payload.message || payload.error?.message)) || 'Некорректные данные запроса';
        } else if (statusCode === 401) {
          msg = 'Ошибка авторизации';
        } else if (statusCode === 403) {
          msg = 'Доступ запрещён';
        } else if (statusCode === 404) {
          msg = 'Ресурс не найден';
        } else if (statusCode === 429) {
          msg = 'Слишком много запросов. Подождите немного.';
        } else if (statusCode >= 500) {
          msg = 'Произошла ошибка на сервере. Попробуйте позже.';
        } else {
          msg = 'Произошла ошибка запроса';
        }

        // В режиме разработки можно логировать детали
        if (import.meta.env.DEV) {
          console.error('[API Error]', {
            status: statusCode,
            url: error?.config?.url,
            data: payload,
          });
        }

        (window as any).__app_toast?.({ type: 'error', title: 'Ошибка', description: msg });
      }
    } catch {}
    return Promise.reject(error);
  },
);

export default api;


