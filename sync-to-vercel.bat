@echo off
setlocal enabledelayedexpansion
title Sync Pekon Banjar Agung: Origin (Main) -> Vercel (Master)
cls

echo ======================================================================
echo    PEKON BANJAR AGUNG - AUTO SYNC SCRIPT (CMD)
echo    Origin : https://github.com/rifky021/Pekon-Banjar-Agung.git (main)
echo    Vercel : https://github.com/rzkyfhrzi21/kkn-banjaragung.git (master)
echo ======================================================================
echo.

:: 1. Cek keberadaan Git
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git tidak ditemukan di PATH sistem!
    echo Pastikan Git sudah terinstall di komputer Anda.
    goto :selesai
)

:: Pindah ke direktori project
cd /d "%~dp0"

:: 2. Pastikan remote vercel mengarah ke repository yang benar
echo [1/4] Memeriksa konfigurasi remote Git...
git remote set-url vercel https://github.com/rzkyfhrzi21/kkn-banjaragung.git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    git remote add vercel https://github.com/rzkyfhrzi21/kkn-banjaragung.git >nul 2>&1
)

:: 3. Melakukan Pull dari origin main
echo.
echo [2/4] Mengambil update terbaru dari origin (main)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Terjadi kendala saat pull dari origin main.
)

:: 4. Cek apakah ada perubahan lokal yang belum di-commit
echo.
echo [3/4] Memeriksa file yang belum di-commit...
git status --porcelain >nul 2>&1
for /f "tokens=*" %%i in ('git status --porcelain') do (
    echo Ditemukan perubahan lokal, melakukan auto-commit...
    git add .
    git commit -m "chore: sync update with origin and vercel deployment"
    goto :lakukan_push
)

:lakukan_push
:: 5. Melakukan Push ke vercel master
echo.
echo [4/4] Mendorong (Push) update ke repo Vercel (master)...
git push vercel master
if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================================
    echo  [SUKSES] Sinkronisasi berhasil!
    echo  Repo Vercel (rzkyfhrzi21/kkn-banjaragung) telah ter-update.
    echo  Deployment Vercel akan otomatis berjalan.
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo  [GAGAL] Gagal melakukan push ke repo Vercel.
    echo  Pastikan Anda login ke akun GitHub rzkyfhrzi21.
    echo ======================================================================
)

:selesai
echo.
echo Tekan sembarang tombol untuk keluar...
pause >nul
