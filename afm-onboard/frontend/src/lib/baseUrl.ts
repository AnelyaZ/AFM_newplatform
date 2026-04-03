export function getApiBaseUrl(): string {
  // Используем только переменную окружения или относительный путь (через Vite proxy)
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1';
  return envUrl.replace(/\/$/, '');
}

// Очистка старых небезопасных значений из localStorage при загрузке
try {
  localStorage.removeItem('AFM_API_URL');
} catch {
  // Игнорируем ошибки если localStorage недоступен
}




