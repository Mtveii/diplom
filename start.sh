#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "→ Starting Telegram Bot on port 5001..."
cd backend/tg-bot
dotnet run --urls "http://localhost:5001" &
TG_PID=$!
cd ../..

echo "→ Starting Discord Bot on port 5002..."
cd backend/ds-bot
dotnet run --urls "http://localhost:5002" &
DS_PID=$!
cd ../..

echo "→ Waiting for bots to start..."
sleep 5

echo "→ Starting Frontend on port 5173..."
cd Frontend

if [ ! -d "node_modules" ]; then
  echo "→ node_modules not found, running npm install..."
  npm install 2>&1 | tail -5
fi

export CHOKIDAR_USEPOLLING=true
export WATCHPACK_POLLING=true
npm run dev -- --host 0.0.0.0

# Cleanup on exit
trap "kill $TG_PID $DS_PID 2>/dev/null" EXIT