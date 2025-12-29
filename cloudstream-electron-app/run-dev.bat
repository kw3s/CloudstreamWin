@echo off
cd /d "%~dp0"
echo Starting Electron Development Server...
echo.
npm run electron:dev
pause
