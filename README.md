# Steam Clan Admin Panel

Дипломный проект: админ-панель для Steam-клана. Backend — ASP.NET Core 8 (Clean Architecture), Frontend — React + TypeScript + Vite.

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

| Роль | Права |
|---|---|
| Viewer | Дашборд, мониторинг игр |
| Analyst | + Аналитика, экспорт отчётов |
| Moderator | + Участники, заявки, алерты, настройки уведомлений |
| SuperAdmin | Всё + управление ролями пользователей |

Вход: через Steam OpenID (для существующих в БД пользователей) и по логину/паролю админа (поле `Users.AdminUsername`/`PasswordHash`, создаётся вручную через SQL/внесение записи).

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