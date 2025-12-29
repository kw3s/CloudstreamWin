# PowerShell script to download Gradle wrapper JAR
# This is needed for the Gradle wrapper to work

$wrapperDir = "gradle\wrapper"
$wrapperJar = "$wrapperDir\gradle-wrapper.jar"
$wrapperVersion = "8.5"

Write-Host "Setting up Gradle wrapper..." -ForegroundColor Cyan

# Create directory if it doesn't exist
if (-not (Test-Path $wrapperDir)) {
    New-Item -ItemType Directory -Path $wrapperDir -Force | Out-Null
    Write-Host "Created directory: $wrapperDir" -ForegroundColor Green
}

# Download gradle-wrapper.jar
Write-Host "Downloading gradle-wrapper.jar..." -ForegroundColor Yellow
$wrapperUrl = "https://raw.githubusercontent.com/gradle/gradle/v$wrapperVersion/gradle/wrapper/gradle-wrapper.jar"

try {
    Invoke-WebRequest -Uri $wrapperUrl -OutFile $wrapperJar -UseBasicParsing
    Write-Host "Successfully downloaded gradle-wrapper.jar" -ForegroundColor Green
    Write-Host "You can now run: .\build.bat" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to download wrapper. Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Install Gradle and run 'gradle wrapper'" -ForegroundColor Yellow
    Write-Host "Download Gradle from: https://gradle.org/install/" -ForegroundColor Yellow
    exit 1
}

