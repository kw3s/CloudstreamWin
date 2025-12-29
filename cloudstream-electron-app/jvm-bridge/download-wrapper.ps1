# Download Gradle wrapper JAR
Write-Host "Downloading Gradle wrapper JAR..." -ForegroundColor Cyan

$wrapperDir = "gradle\wrapper"
$wrapperJar = "$wrapperDir\gradle-wrapper.jar"
$wrapperVersion = "8.5"

# Create directory if needed
if (-not (Test-Path $wrapperDir)) {
    New-Item -ItemType Directory -Path $wrapperDir -Force | Out-Null
    Write-Host "Created directory: $wrapperDir" -ForegroundColor Green
}

# Try to download
$urls = @(
    "https://github.com/gradle/gradle/raw/v$wrapperVersion/gradle/wrapper/gradle-wrapper.jar",
    "https://raw.githubusercontent.com/gradle/gradle/v$wrapperVersion/gradle/wrapper/gradle-wrapper.jar"
)

$downloaded = $false
foreach ($url in $urls) {
    try {
        Write-Host "Trying: $url" -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        [System.IO.File]::WriteAllBytes((Resolve-Path .).Path + "\$wrapperJar", $response.Content)
        $downloaded = $true
        Write-Host "Successfully downloaded gradle-wrapper.jar" -ForegroundColor Green
        break
    } catch {
        Write-Host "Failed: $_" -ForegroundColor Yellow
    }
}

if (-not $downloaded) {
    Write-Host ""
    Write-Host "Failed to download automatically." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually:" -ForegroundColor Yellow
    Write-Host "1. Open: https://github.com/gradle/gradle/raw/v$wrapperVersion/gradle/wrapper/gradle-wrapper.jar" -ForegroundColor White
    Write-Host "2. Save as: $wrapperJar" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
} else {
    Write-Host ""
    Write-Host "You can now run: .\build.bat" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

