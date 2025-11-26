@echo off
cd /d "%~dp0"
echo Starting VisTeX...
start "" /B npm run dev
echo Waiting for dev server to start...
timeout /t 5 /nobreak >nul
start "" http://localhost:5173/
pause
