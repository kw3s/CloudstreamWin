# Building the JVM Bridge

## Quick Start (Easiest Method)

### Windows
1. Open a terminal/command prompt
2. Navigate to the bridge directory:
   ```bash
   cd cloudstream-electron-app\jvm-bridge
   ```
3. Run the build script:
   ```bash
   build.bat
   ```

That's it! The script will handle everything.

## Manual Build Methods

### Method 1: Using Gradle Wrapper (Recommended)

**Prerequisites:**
- Java 17 or higher installed
- Gradle wrapper files (gradlew.bat and gradle-wrapper.jar)

**Steps:**
```bash
cd cloudstream-electron-app\jvm-bridge
gradlew.bat jar
```

The JAR will be created at: `build\libs\jvm-bridge-1.0.0.jar`

### Method 2: Using System Gradle

**Prerequisites:**
- Java 17 or higher installed
- Gradle installed and in PATH

**Steps:**
```bash
cd cloudstream-electron-app\jvm-bridge
gradle jar
```

### Method 3: Using IntelliJ IDEA

1. Open the `jvm-bridge` folder as a project in IntelliJ IDEA
2. Wait for Gradle sync to complete
3. Open the Gradle tool window
4. Navigate to: `Tasks` → `build` → `jar`
5. Double-click `jar` to build

## Verifying the Build

After building, check that the JAR exists:
```bash
dir build\libs\jvm-bridge-1.0.0.jar
```

You should see a file that's several MB in size (contains all dependencies).

## Testing the Bridge Manually

You can test the bridge before running the Electron app:

```bash
java -jar build\libs\jvm-bridge-1.0.0.jar
```

Or specify a port:
```bash
java -jar build\libs\jvm-bridge-1.0.0.jar 8765
```

The bridge will start an HTTP server. You can test it by opening:
- Health check: http://127.0.0.1:8765/health

## Troubleshooting

### "Java is not recognized"
- Install Java 17 or higher from: https://adoptium.net/
- Make sure Java is added to your PATH
- Restart your terminal after installing

### "Gradle wrapper not found"
- The wrapper files might be missing
- You can download them or use system Gradle instead
- Or run: `gradle wrapper` (if you have Gradle installed)

### "Build failed with dependency errors"
- Check your internet connection (Gradle needs to download dependencies)
- Try: `gradlew.bat build --refresh-dependencies`

### "Port already in use"
- Another instance of the bridge might be running
- Close it or use a different port

## Next Steps

Once the bridge is built:
1. The Electron app will automatically detect it
2. Restart the Electron app if it's already running
3. Try installing a Cloudstream plugin - it should work now!

