@echo off
setlocal

cd /d "%~dp0"

echo Starting API server...
start "SubNote API" cmd /k "cd /d %~dp0 && npm run server"

echo Starting frontend dev server...
start "SubNote Web" cmd /k "cd /d %~dp0 && npm run dev"

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo Done.
endlocal
