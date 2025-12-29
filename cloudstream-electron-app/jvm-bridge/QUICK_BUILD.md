# Quick Build Guide

## Step 1: Setup Gradle Wrapper (One-time setup)

You need the Gradle wrapper JAR file. Choose one method:

### Option A: Download automatically (PowerShell)
```powershell
cd cloudstream-electron-app\jvm-bridge
.\setup-gradle-wrapper.ps1
```

### Option B: Download manually
1. Go to: https://raw.githubusercontent.com/gradle/gradle/v8.5/gradle/wrapper/gradle-wrapper.jar
2. Save it to: `cloudstream-electron-app\jvm-bridge\gradle\wrapper\gradle-wrapper.jar`

### Option C: Install Gradle and generate wrapper
1. Install Gradle from: https://gradle.org/install/
2. Run:
   ```bash
   cd cloudstream-electron-app\jvm-bridge
   gradle wrapper
   ```

## Step 2: Build the Bridge

Once the wrapper is set up, simply run:

```bash
cd cloudstream-electron-app\jvm-bridge
.\build.bat
```

Or manually:
```bash
.\gradlew.bat jar
```

## Step 3: Verify

Check that the JAR was created:
```bash
dir build\libs\jvm-bridge-1.0.0.jar
```

You should see a file that's several MB in size.

## Done!

The Electron app will automatically detect the bridge when you restart it.

