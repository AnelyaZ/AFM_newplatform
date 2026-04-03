import { getApiBaseUrl } from './baseUrl';

export function toMediaUrl(key: string): string {
  const base = getApiBaseUrl();
  // Надёжно получаем origin бэкенда даже если base относительный (например, "/api/v1")
  let origin: string;
  try {
    const parsed = new URL(base, window.location.origin);
    origin = parsed.origin;
  } catch {
    origin = window.location.origin;
  }
  try {
    // If key is already absolute URL
    const u = new URL(key);
    return u.toString();
  } catch {
    // Relative key, prefix backend origin
    return new URL(key.startsWith('/') ? key : `/${key}`, origin).toString();
  }
}


