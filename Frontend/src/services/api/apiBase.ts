/**
 * Адрес Slush API — всегда пустая строка: запросы идут на тот же источник,
 * где их проксирует nginx (docker), vite (dev) или Vercel rewrites (prod).
 * Раньше здесь читался env VITE_API_BASE_URL, но его случайное значение
 * на сборке Vercel вшивало прямой адрес Azure и ломало CORS.
 */
export const API_BASE_URL = ''
