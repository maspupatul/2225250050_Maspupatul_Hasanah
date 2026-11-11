@echo off
rem Mode pengembangan: perubahan kode langsung terlihat (API :8000, web :5173).
cd /d "%~dp0"
start "Z-Math API" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "Z-Math Web" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 >nul
start "" http://localhost:5173
