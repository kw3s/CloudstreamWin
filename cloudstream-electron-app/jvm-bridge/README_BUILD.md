# How to Build the JVM Bridge

## Prerequisites
✅ **Java 17+ is installed** (you have Java 23 - perfect!)

## Quick Build (3 Steps)

### Step 1: Get Gradle Wrapper JAR

You need the `gradle-wrapper.jar` file. **Choose the easiest method for you:**

#### Method A: Download from GitHub (Easiest)
1. Open your browser
2. Go to: https://github.com/gradle/gradle/raw/v8.5/gradle/wrapper/gradle-wrapper.jar
3. Save the file to: `cloudstream-electron-app\jvm-bridge\gradle\wrapper\gradle-wrapper.jar`
   - Create the `gradle\wrapper` folders if they don't exist

#### Method B: Use Gradle to Generate It
1. Install Gradle from: https://gradle.org/install/ (or use a package manager)
2. Open terminal in `jvm-bridge` folder
3. Run: `gradle wrapper`
4. This will create all wrapper files automatically

#### Method C: Copy from Another Project
If you have another Gradle project, copy its `gradle\wrapper\gradle-wrapper.jar` file.

### Step 2: Build the Bridge

Once you have the wrapper JAR, run:

```bash
cd cloudstream-electron-app\jvm-bridge
.\build.bat
```

Or manually:
```bash
.\gradlew.bat jar
```

### Step 3: Verify

Check that the JAR was created:
```bash
dir build\libs\jvm-bridge-1.0.0.jar
```

You should see a file that's several MB in size (contains all dependencies).

## What Happens During Build?

1. Gradle downloads all dependencies (Ktor, Kotlin, etc.)
2. Compiles the Kotlin code
3. Packages everything into a single JAR file
4. The JAR is ready to use!

## Troubleshooting

### "gradlew.bat: command not found"
- Make sure you're in the `jvm-bridge` directory
- Check that `gradlew.bat` exists

### "gradle-wrapper.jar not found"
- You need to complete Step 1 above
- The wrapper JAR is required for the build

### "Java not found"
- Make sure Java is in your PATH
- Test with: `java -version`

### Build takes a long time
- First build downloads all dependencies (~100MB)
- Subsequent builds are much faster

## After Building

Once the JAR is built:
1. **Restart your Electron app** (if it's running)
2. The app will automatically detect the bridge
3. Try installing a Cloudstream plugin - it should work!

The bridge JAR location: `jvm-bridge\build\libs\jvm-bridge-1.0.0.jar`

