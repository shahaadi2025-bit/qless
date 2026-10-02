@echo off
title QLESS - Public Cloud & Local Engine
echo ========================================================
echo   QLESS - UNIVERSAL REAL-TIME QUEUE INFRASTRUCTURE
echo   "JOIN THE QUEUE. NOT THE CROWD."
echo ========================================================
echo.
echo Starting Backend Engine and Frontend...
start "QLESS Backend" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak > nul
start "QLESS Frontend" cmd /k "cd client && npm run dev"
timeout /t 4 /nobreak > nul
echo.
echo Launching Instant Worldwide Cloudflare Tunnel...
start "QLESS Public Link" cmd /k "%TEMP%\cloudflared.exe tunnel --url http://localhost:5173"
echo.
echo ========================================================
echo   Local URL:    http://localhost:5173
echo   Check the 'QLESS Public Link' window for your public HTTPS URL!
echo ========================================================
pause
