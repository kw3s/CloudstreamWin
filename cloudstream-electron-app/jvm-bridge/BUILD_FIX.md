# Build Error Fix

## Problem
The build was failing with:
```
org/gradle/api/internal/HasConvention
```

This is a compatibility issue between:
- System Gradle 9.1.0 (from Chocolatey)
- Kotlin plugin 1.9.20 (incompatible with Gradle 9.x)

## Solution
1. **Updated Kotlin plugin** to version 2.0.0 (compatible with Gradle 8.5+)
2. **Fixed build script** to properly detect failures
3. **Cleaned build directory** to start fresh

## Try Building Again

```bash
cd cloudstream-electron-app\jvm-bridge
.\build.bat
```

The build script will now:
- Properly detect if the build failed
- Check if the JAR was actually created
- Report accurate success/failure status

## If It Still Fails

The wrapper should use Gradle 8.5, but if system Gradle 9.1.0 is interfering:

1. **Remove system Gradle from PATH** (temporarily)
2. **Or update wrapper to Gradle 9.1.0** and use compatible Kotlin version:
   - Edit `gradle/wrapper/gradle-wrapper.properties`
   - Change to: `distributionUrl=https\://services.gradle.org/distributions/gradle-9.1.0-bin.zip`
   - Update Kotlin to 2.0.21 or later

## Note
The build script now properly checks for errors, so you'll get accurate feedback.

