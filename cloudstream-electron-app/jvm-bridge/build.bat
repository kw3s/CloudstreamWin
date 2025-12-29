@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Building JVM Bridge for Cloudstream
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"
echo Current directory: %CD%
echo.

REM Check if Java is installed
echo [1/5] Checking Java installation...
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java 17 or higher
    echo.
    pause
    exit /b 1
)
java -version
echo Java found.
echo.

REM Check if wrapper exists
echo [2/5] Checking for Gradle wrapper...
if not exist gradlew.bat (
    echo ERROR: gradlew.bat not found!
    echo Make sure you're in the jvm-bridge directory.
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)
echo gradlew.bat found.
echo.

REM Check if wrapper JAR exists
echo [3/5] Checking for gradle-wrapper.jar...
set "WRAPPER_JAR=gradle\wrapper\gradle-wrapper.jar"
set "WRAPPER_JAR_FULL=%CD%\%WRAPPER_JAR%"
echo Checking relative path: %WRAPPER_JAR%
echo Checking full path: %WRAPPER_JAR_FULL%

REM Try both relative and absolute paths
if exist "%WRAPPER_JAR%" (
    echo File found using relative path!
    goto :wrapper_found
)
if exist "%WRAPPER_JAR_FULL%" (
    echo File found using absolute path!
    goto :wrapper_found
)

REM File not found - show debugging info
echo.
echo ERROR: gradle-wrapper.jar not found!
echo Searched locations:
echo   - %WRAPPER_JAR%
echo   - %WRAPPER_JAR_FULL%
echo Current directory: %CD%
echo.
echo Checking if directory exists...
if exist "gradle\wrapper" (
    echo Directory exists, listing contents:
    dir "gradle\wrapper" 2>nul
) else (
    echo Directory gradle\wrapper does not exist!
    echo Creating it now...
    mkdir "gradle\wrapper" 2>nul
)
echo.
echo You need to download it first:
echo 1. Go to: https://github.com/gradle/gradle/raw/v8.5/gradle/wrapper/gradle-wrapper.jar
echo 2. Save it to: %WRAPPER_JAR_FULL%
echo.
echo Press any key to exit...
pause >nul
exit /b 1

:wrapper_found
echo gradle-wrapper.jar found!
if exist "%WRAPPER_JAR%" (
    for %%A in ("%WRAPPER_JAR%") do echo File size: %%~zA bytes
) else (
    for %%A in ("%WRAPPER_JAR_FULL%") do echo File size: %%~zA bytes
)
echo.

REM Skip stopping daemons (can cause hangs, and --no-daemon flag handles it anyway)
echo [4/5] Preparing for build...
echo (Skipping daemon stop - using --no-daemon flag instead)
echo.

REM Run the build
echo [5/5] Starting build (this may take a few minutes)...
echo Note: Using reduced memory settings for systems with limited RAM
echo.
echo ========================================
echo.

REM Run build and capture error code
call gradlew.bat jar --no-daemon
set BUILD_RESULT=!ERRORLEVEL!

echo.
echo ========================================
if !BUILD_RESULT! equ 0 (
    echo Build command completed with exit code 0
) else (
    echo Build command FAILED with exit code !BUILD_RESULT!
)
echo ========================================
echo.

REM Check if JAR was created
if exist "build\libs\jvm-bridge-1.0.0.jar" (
    echo JAR file found: build\libs\jvm-bridge-1.0.0.jar
    for %%A in ("build\libs\jvm-bridge-1.0.0.jar") do echo File size: %%~zA bytes
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo You can now run the Electron app and it will use this bridge.
    set FINAL_RESULT=0
) else (
    echo ERROR: JAR file not found at: build\libs\jvm-bridge-1.0.0.jar
    echo.
    echo The build may have failed. Check the error messages above.
    echo.
    if exist "build\reports" (
        echo Build reports are available in: build\reports
    )
    set FINAL_RESULT=1
)

echo.
echo Press any key to exit...
pause >nul
exit /b !FINAL_RESULT!
