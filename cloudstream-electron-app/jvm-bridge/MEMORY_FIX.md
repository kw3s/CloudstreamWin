# Memory Issue Fix

## Problem
The build was crashing with "insufficient memory" because:
- Your system has 3GB RAM
- Gradle was trying to use 2GB heap (-Xmx2048m)
- This left insufficient memory for the OS and other processes

## Solution Applied
Updated `gradle.properties` to use much less memory:
- Reduced heap to 512MB (-Xmx512m)
- Reduced initial heap to 256MB (-Xms256m)
- Disabled parallel builds
- Limited worker processes to 1
- Disabled Gradle daemon (runs without background process)

## Building Now
The build should work now. Run:
```bash
.\build.bat
```

Or manually:
```bash
.\gradlew.bat jar --no-daemon
```

## If Build Still Fails
1. Close other applications to free up RAM
2. Restart your computer to clear memory
3. Try building with even less memory (edit gradle.properties):
   ```
   org.gradle.jvmargs=-Xmx256m -Xms128m -Dfile.encoding=UTF-8
   ```

## Note
The build might be slower with reduced memory, but it should complete successfully.

