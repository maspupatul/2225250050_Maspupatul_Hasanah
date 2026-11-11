@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   Z-Math - menjalankan aplikasi
echo ==========================================

if not exist backend\.venv\Scripts\python.exe (
  echo [1/3] Menyiapkan Python (sekali saja^)...
  python -m venv backend\.venv
  if errorlevel 1 goto :error
  backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  if errorlevel 1 goto :error
)

if not exist frontend\node_modules (
  echo [2/3] Memasang paket JavaScript (sekali saja^)...
  pushd frontend
  call npm install
  if errorlevel 1 (
    popd
    goto :error
  )
  popd
)

echo [3/3] Membangun aplikasi web...
pushd frontend
call npm run build
if errorlevel 1 (
  popd
  goto :error
)
popd

echo.
echo Aplikasi siap di:  http://localhost:8000
echo HP di Wi-Fi yang sama: http://ALAMAT-IP-KOMPUTER:8000  (cek dengan perintah ipconfig)
echo Tekan Ctrl+C untuk berhenti.
echo.
start "" http://localhost:8000
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
goto :eof

:error
echo.
echo Terjadi kesalahan. Pastikan Python dan Node.js sudah terpasang.
pause
