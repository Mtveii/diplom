/**
 * Адрес Slush API: из env или пустая строка (запросы идут на тот же источник,
 * где их проксирует nginx/vite/Vercel — так не возникает проблем с CORS).
 * Вынесен отдельно, чтобы избежать циклических импортов.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
