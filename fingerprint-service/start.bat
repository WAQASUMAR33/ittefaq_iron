@echo off
title DigitalPersona Fingerprint Service
color 0A

echo.
echo  Itefaq Fingerprint Bridge
echo  =========================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo  Installing dependencies...
    call npm install
    echo.
)

echo  TIP: To auto-start this service with Windows (run once as Admin):
echo       node install-service.js
echo.
echo  Starting fingerprint service on ws://localhost:15896
echo  Keep this window open while using the app.
echo  Press Ctrl+C to stop.
echo.

node server.js

pause
