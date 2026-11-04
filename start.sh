#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Fix rollup native.js if it was corrupted (pointing to Windows binary)
if grep -q "rollup-win32-x64-msvc" Frontend/node_modules/rollup/dist/native.js 2>/dev/null; then
  echo "→ Restoring rollup native.js..."
  rm -f Frontend/node_modules/rollup/dist/native.js
fi

# Ensure rollup Linux binary is installed
if [ ! -d "Frontend/node_modules/@rollup/rollup-linux-x64-gnu" ]; then
  echo "→ Installing missing @rollup/rollup-linux-x64-gnu..."
  cd Frontend
  npm install --save-dev @rollup/rollup-linux-x64-gnu --force 2>&1 | tail -2
  cd ..
fi

# Ensure esbuild Linux binary is installed
if [ ! -d "Frontend/node_modules/@esbuild/linux-x64" ]; then
  echo "→ Installing missing @esbuild/linux-x64..."
  cd Frontend
  npm install --save-dev @esbuild/linux-x64 --force 2>&1 | tail -2
  cd ..
fi

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
sleep 8

echo "→ Starting Frontend on port 5173..."
cd Frontend
export CHOKIDAR_USEPOLLING=true
export WATCHPACK_POLLING=true
npm run dev -- --host 0.0.0.0

# Cleanup on exit
trap "kill $TG_PID $DS_PID 2>/dev/null" EXIT