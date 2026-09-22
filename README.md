# Steam Users Admin Panel

Дипломный проект: админ-панель мониторинга пользователей Steam (активность, создание аккаунтов). Backend — ASP.NET Core 8 (Clean Architecture), Frontend — React + TypeScript + Vite.

## Состав

- **Backend** (`backend/` — решение `SteamAdminPanel.sln`, 5 проектов):
  - `src/Domain` — сущности и enum (14 сущностей).
  - `src/Application` — DTO, порты, интерфейсы, 11 сервисов бизнес-логики, FluentValidation-валидаторы.
  - `src/Infrastructure` — EF Core (PostgreSQL), Redis, JWT, Steam Web API/OpenID/Spy, уведомления (Discord/Telegram/Email/InApp), отчёты (PDF/Excel), Hangfire-джобы.
  - `src/API` — контроллеры, SignalR `/hubs/dashboard`, rate limiter, Swagger, middleware обработки ошибок.
  - `tests/SteamAdminPanel.Application.Tests` — xUnit + NSubstitute.
- **Frontend** (`Frontend/`) — React 18 + TS, Zustand, React Router, Recharts, Tailwind, SignalR-клиент. HTTP-запросы только через `services/api/*`.

## Быстрый старт (локально)

Требования: .NET SDK 8, Node 20+, PostgreSQL 16, Redis 7.

```bash
# 1. Запустить PostgreSQL и Redis (или)
docker compose up -d postgres redis

# 2. Backend
cd backend
dotnet tool restore                        # dotnet-ef
dotnet ef database update -s src/API       # применяет миграции
dotnet run --project src/API               # http://localhost:5000, Swagger на /swagger

# 3. Frontend
cd ../Frontend
npm install
npm run dev                                # http://localhost:5173 (proxy на :5000)
```

## Запуск целиком через Docker

```bash
# настроить ключи (обязательно!)
export STEAM_API_KEY="..."
export JWT_SECRET_KEY="..."   # >= 32 символов

docker compose up -d --build
# Frontend: http://localhost:5173
# API/Swagger: http://localhost:8080/swagger
# Hangfire: http://localhost:8080/hangfire
```

При первом старте схема БД создаётся автоматически (`Database__AutoMigrate=true`).

## Роли и права

| Роль | Рівень | Доступ (сверено с `[Authorize]` бэкенда) |
|---|---|---|
| Analyst | 1 | Дашборд, мониторинг игр, аналитика |
| Moderator | 2 | + Участники (бан/разбан, кроме себя и Admin/SuperAdmin) |
| Admin | 3 | + Алерты (правила), аудит-лог, командный центр, настройки |
| SuperAdmin | 4 | + Смена ролей пользователям (кроме себя — запрещает бэкенд) |

SuperAdmin всегда один: второго назначить нельзя, последнего разжаловать/забанить нельзя (фронт-гард; бэкенд отдельно запрещает менять свою роль и банить себя).

Свой уровень видно в шапке (бейдж «Рівень N · Роль», 0/Гость — анонимно).

Экрана логина нет. Кто зашёл — определяется тихим входом: у каждого человека свои креды в локальном gitignored `Frontend/.env.local`, сайт молча логинится и берёт роль из JWT claim (`role` или `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`). Разным людям — разные креды → разный доступ. UI-гейты (`RequireRole`, фильтр меню, `utils/role.ts`) — только удобство: последнее слово за бэкендом (401/403).

Нюансы:
- Роль живёт до истечения JWT: после смены роли на бэке нужен новый логин (тихий вход сам перелогинится, когда токен протухнет).
- Соответствие int → имя роли в `PUT /api/Admin/users/{id}/role` живым запросом не проверено (в БД есть только `User` и `SuperAdmin`) — перед сменой чужих ролей сверить с бекендером.

Вход: экрана логина нет. В локальном dev (`npm run dev`) сайт тихо логинится кредами из gitignored `Frontend/.env.local` и показывает данные; без кредов запросы идут анонимно, закрытые эндпоинты вернут 401 и страницы покажут пустые состояния. В прод-сборке тихого входа нет (ветка вырезается) — всегда анонимно.

Переменные окружения Frontend: см. `Frontend/.env.example`.

## Базовые команды

```bash
# Backend: тесты, форматирование
cd backend
dotnet test
dotnet format --verify-no-changes

# Frontend: lint и production-сборка
cd Frontend
npm run lint
npm run build

# Миграции EF Core (создать новую)
cd backend
dotnet ef migrations add Migname -p src/Infrastructure -s src/API
```

## Структура монетики и отчётов

- Снапшоты статусов/playtime/игр/достижений собираются Hangfire-джобами (5 мин/час/сутки).
- Алерты: правила (не заходит N дней / падение ревью / скидка / новости) — итог в `AlertHistories` + push через SignalR и канал уведомлений.
- Аналитика: retention, churn-risk, когорты, сравнение периодов; экспорт PDF/Excel в `AnalyticsController`.

## CI

`.github/workflows/ci.yml`: сборка backend + xUnit-тесты; lint + production-сборка frontend.