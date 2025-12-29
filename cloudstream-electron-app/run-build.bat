@echo off
cd /d "%~dp0"
echo Building Electron Application...
echo.
npm run electron:build
echo.
echo Build complete! Check the dist folder for output.
pause
