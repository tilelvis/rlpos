@echo off
title Raicilabs POS

cd /d "%~dp0"

if not exist "server.exe" (
    echo.
    echo ERROR: server.exe was not found.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo          RAICILABS POS
echo ==========================================
echo.
echo Starting offline POS...
echo.
echo The POS will open automatically.
echo.
echo DO NOT CLOSE this window while using POS.
echo.

start "" "%~dp0server.exe"

exit
