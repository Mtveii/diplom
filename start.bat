@echo off
cd /d "%~dp0"

echo Starting Telegram Bot on port 5001...
start "TG Bot" cmd /c "cd /d %~dp0backend\tg-bot && dotnet run --urls http://localhost:5001"

echo Starting Discord Bot on port 5002...
start "DS Bot" cmd /c "cd /d %~dp0backend\ds-bot && dotnet run --urls http://localhost:5002"

timeout /t 8 /nobreak >nul

echo Starting Frontend on port 5173...
cd /d "%~dp0Frontend"

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

set CHOKIDAR_USEPOLLING=true
set WATCHPACK_POLLING=true
npm run dev -- --host 0.0.0.0