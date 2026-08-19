#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1. Запуск БД (PostgreSQL & Redis) через Docker ==="
cd "$ROOT_DIR"
docker compose up -d postgres redis

echo "Остановка контейнера API в Docker (чтобы освободить порт 8080 для локального запуска)..."
docker compose stop api 2>/dev/null || true

echo "=== 2. Запуск Backend (ASP.NET Core API) ==="
cd "$ROOT_DIR/backend"
export PATH="$HOME/.dotnet:$PATH"
dotnet run --project src/API/SteamAdminPanel.Api.csproj &
BACKEND_PID=$!

echo "=== 3. Запуск Frontend (React + Vite) как хост ==="
cd "$ROOT_DIR/Frontend"
if [ ! -d "node_modules" ]; then
  echo "Установка зависимостей frontend..."
  npm install
fi

# Cleanup on exit
cleanup() {
  echo "Остановка сервисов..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM EXIT

npm run dev -- --host &
FRONTEND_PID=$!

echo "=========================================="
echo " Проект успешно запущен!"
echo " Локальный доступ: http://localhost:5173"
echo " Сетевой хост (Tailscale/IP): http://<ваш-ip>:5173"
echo " Бэкенд API / Swagger: http://localhost:8080/swagger"
echo " Командный центр: http://localhost:5173/command-center"
echo "=========================================="

wait $FRONTEND_PID
