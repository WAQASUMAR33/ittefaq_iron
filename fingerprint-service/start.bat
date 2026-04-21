@echo off
title DigitalPersona Fingerprint Service
color 0A

echo.
echo  DigitalPersona U.are.U 4500 - Local Bridge Service
echo  ====================================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo  Installing dependencies...
    call npm install
    echo.
)

echo  Starting fingerprint service on ws://localhost:15896
echo  Keep this window open while using the app.
echo  Press Ctrl+C to stop.
echo.

node server.js

pause
