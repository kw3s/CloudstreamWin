@echo off
echo ========================================
echo Downloading Gradle Wrapper JAR
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Run PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0download-wrapper.ps1"

REM Pause to see results
echo.
pause

