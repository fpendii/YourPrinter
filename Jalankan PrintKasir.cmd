@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Menyiapkan aplikasi untuk pertama kali...
  call npm install
  if errorlevel 1 (
    echo.
    echo Instalasi gagal. Pastikan Node.js sudah terpasang dan koneksi internet tersedia.
    pause
    exit /b 1
  )
)

call npm start
if errorlevel 1 pause
