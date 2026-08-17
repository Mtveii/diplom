# План: полноценная мобильная адаптация админ-панели

Подтверждено пользователем: **bottom-навбар** + **все фиксы** (включая мелкие).

## Контекст (результат исследования)

- Оболочка `AppLayout` мобильная (сайдбар `hidden lg:flex`), но **навигация на <1024px отсутствует полностью**.
- Страницы — «десктопные с flex-wrap»: таблица участников ~900px, панель уведомлений 384px обрезается `overflow-hidden`, переполнения в настройках, StatCard в 2 колонки, табы без wrap, фильтры мониторинга всегда развёрнуты.
- Проверка: `npm run lint`, `npx tsc -b`, `npm run build` (тест-скрипта в package.json нет).

## Туду-лист (12 шагов)

### Шаг 1. Мобильный bottom-навбар — `Frontend/src/components/AppLayout.tsx`
- После `</div>` контента, перед закрытием корневого `<div>` — `<nav className="fixed inset-x-0 bottom-0 z-40 ... lg:hidden">`.
- `grid grid-cols-6`, пункты из существующего `navItems` (иконки `h-[18px] w-[18px]` переиспользовать), бейджи как в сайдбаре (`appBadge` для `/applications`, `alertBadge` для `/games`).
- NavLink `flex-col items-center gap-1 py-2.5 text-[10px]`, active → `text-primary-400` + индикатор-полоска сверху.
- `pb-[env(safe-area-inset-bottom)]` на навбаре (iPhone).
- Контент `main`: `p-4` → `p-4 pb-24 lg:p-8 lg:pb-8` (не перекрывать навбар).

### Шаг 2. ClanMembersPage — `Frontend/src/pages/ClanMembersPage.tsx`
- Дефолт view: карточки на мобильном. Текущее: `useState<ViewMode>('table')` (стр. 58). Добавить хук `useMediaQuery('(min-width: 640px)')` (новый хук `Frontend/src/hooks/useMediaQuery.ts`) → дефолт `isDesktop ? 'table' : 'grid'`; переключатель вью оставить.
- Таблица: скрыть второстепенные колонки на мобильном — `hidden md:table-cell` (Checkbox/Player/Status остаются, Rank/Playtime/Last online/Joined/Activity/actions — по смыслу).
- Дропдаун действий (стр. ~605, `absolute right-0 top-full z-50 w-44` внутри `td.relative`): в карточном вью и так ок; в таблице — клиппится `overflow-x-auto`, на мобильном карточки решают; дополнительно `whitespace-nowrap` на строках таблицы не трогать.

### Шаг 3. NotificationBell — `Frontend/src/components/NotificationBell.tsx`
- Стр. 44: `w-96` + `left-0` → добавить `max-w-[calc(100vw-2rem)]`; на мобильном прижимать к правому краю: `lg:left-auto lg:right-0` дополнить мобильной привязкой. Решение: заменить на `right-0` всегда + `left-auto`? В хедере колокольчик стоит справа — панель `right-0` корректна на всех экранах. Меняем на: `absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)]`.

### Шаг 4. SettingsPage — `Frontend/src/pages/SettingsPage.tsx`
- Строка канала (стр. 99): `flex items-center gap-4 border-b pb-4` → добавить `flex-wrap`, label → `truncate` в `min-w-0 flex-1`.
- Строка роли (стр. 157): блок имени `flex-1 text-sm` → `flex-1 min-w-0 text-sm`, text → `truncate`.

### Шаг 5. ConfirmModal — `Frontend/src/components/ConfirmModal.tsx`
- Стр. 55: панель `w-full max-w-md` → добавить `max-h-[85vh] overflow-y-auto` (как в `Modal.tsx`).

### Шаг 6. StatCard-гриды — `Frontend/src/pages/DashboardPage.tsx`, `GameDetailPage.tsx`
- Dashboard стр. 279: `grid grid-cols-2 gap-4 xl:grid-cols-4` → `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- GameDetail стр. 207: `grid grid-cols-2 gap-4 lg:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; стр. 291 аналогично → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

### Шаг 7. Табы — ApplicationsPage (стр. 184), GameMonitorPage (стр. 349), MemberDetailModal (стр. 157)
- На все контейнеры табов: `overflow-x-auto` + кнопкам `shrink-0 whitespace-nowrap`.

### Шаг 8. GameMonitorPage — сворачиваемые фильтры
- Aside-фильтры (`flex-col lg:flex-row`, aside стр. 364): на мобильном спрятать в сворачиваемый блок. Простой способ: кнопка «Фильтры» (`lg:hidden`) + `useState` `filtersOpen`; aside на мобильном: `hidden` → `block` по состоянию, классы `lg:block` поверх.

### Шаг 9. Мелкие фиксы
- `Toaster.tsx`: `w-80` → `w-80 max-w-[calc(100vw-2rem)]`; сдвиг выше навбара на мобильном: `bottom-4` → `bottom-20 lg:bottom-4`.
- `GameCatalogCard.tsx` стр. ~207: кнопка мониторинга `absolute bottom-2 right-2` — добавить футеру `pr-9`/карточке нижний отступ `pb-12`? Точно: у карточки нет отступа под кнопку — добавить футер-блоку `pr-10` (кнопка 28px + right-2).
- `HeatmapChart.tsx` стр. 41: хедер `flex items-center justify-between` → `flex flex-wrap items-center gap-2`.
- Touch-targetы: кнопки «Принять/Отклонить» в ApplicationsPage `py-1.5 text-xs` → `py-2` (высота ≥40px); кнопки в AlertRulesPanel строках — добавить `min-h-[40px]`; три-точка в таблице участников `h-8 w-8` → `h-10 w-10` (в карточном вью).
- `CommandPalette.tsx`: добавить экспорт кнопки-триггера для мобильного хедера? Проще: в AppLayout мобильный хедер добавить иконку-лупу, открывающую палитру. Смотреть CommandPalette — если открытие только Ctrl+K, добавить кастомное событие `window.dispatchEvent(new CustomEvent('open-command-palette'))` в палитре и кнопку в хедере.

### Шаг 10. Проверка сборки
`cd Frontend && npm run lint && npx tsc -b && npm run build`

### Шаг 11. Функциональный тест
- Запустить dev-сервер, пройти чек-лист сценариев (в DevTools mobile-режим 375×667):
  1. `/login` — вход, форма влезает.
  2. Навигация: все 6 пунктов bottom-навбара переключают страницы, бейджи заявок/алертов видны.
  3. Дашборд — статы в 1–2 колонки, топы, колечки не вылезают.
  4. Участники — дефолт карточки, поиск/фильтры, открыть профиль, сменить ранг, карточки действий.
  5. Заявки — табы скроллятся, принять/отклонить с причиной.
  6. Мониторинг — фильтры сворачиваются/разворачиваются, каталог в 1 колонку, инфо-модалка.
  7. Аналитика — графики и хитмап со скроллом.
  8. Настройки — каналы и роли не переполняются, правило алерта создаётся.
  9. Уведомления — панель влезает в экран, «Прочитать все» и переход к мониторингу.
  10. Тосты приходят поверх контента, не перекрываются навбаром.
- Что не удаётся проверить в CLI — пометить в отчёте для ручной проверки.

### Шаг 12. Итоговый отчёт
- Список изменённых файлов (1 строка на файл), статус lint/build, результаты чек-листа: что работает, что требует ручной визуальной проверки.

## Затрагиваемые файлы (все — Frontend)
1. `src/components/AppLayout.tsx` — bottom-навбар, отступ main
2. `src/hooks/useMediaQuery.ts` — новый хук (папка hooks существует)
3. `src/pages/ClanMembersPage.tsx` — дефолт view, колонки таблицы
4. `src/components/NotificationBell.tsx` — панель
5. `src/pages/SettingsPage.tsx` — строки каналов/ролей
6. `src/components/ConfirmModal.tsx` — max-h + скролл
7. `src/pages/DashboardPage.tsx`, `src/pages/GameDetailPage.tsx` — гриды статов
8. `src/pages/ApplicationsPage.tsx`, `src/pages/GameMonitorPage.tsx`, `src/components/MemberDetailModal.tsx` — табы
9. `src/pages/GameMonitorPage.tsx` — фильтры
10. `src/components/Toaster.tsx`, `src/components/GameCatalogCard.tsx`, `src/components/HeatmapChart.tsx`, `src/components/CommandPalette.tsx` — мелочи

Backend не затрагивается. Миграции/контракты не меняются. Новых архитектурных слоёв не создаётся.
