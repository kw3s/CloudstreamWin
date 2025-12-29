# Setup Instructions

## Step 1: Download Gradle Wrapper JAR

The build script needs the `gradle-wrapper.jar` file. You have two options:

### Option A: Automatic Download (PowerShell)
```powershell
cd cloudstream-electron-app\jvm-bridge
.\download-wrapper.ps1
```

### Option B: Manual Download
1. Open your browser
2. Go to: https://github.com/gradle/gradle/raw/v8.5/gradle/wrapper/gradle-wrapper.jar
3. Save the file to: `cloudstream-electron-app\jvm-bridge\gradle\wrapper\gradle-wrapper.jar`
   - Create the `gradle\wrapper` folders if they don't exist

## Step 2: Build the Bridge

Once the wrapper JAR is in place:

```bash
cd cloudstream-electron-app\jvm-bridge
.\build.bat
```

The build script will now:
- Show clear progress messages
- Check for all prerequisites
- Display errors clearly
- Wait for you to press a key before closing

## Troubleshooting

### "Window closes immediately"
- Make sure you're running `build.bat` (not double-clicking in some cases)
- Check that `gradle-wrapper.jar` exists
- Run from Command Prompt or PowerShell to see errors

### "gradle-wrapper.jar not found"
- Complete Step 1 above
- The file must be at: `gradle\wrapper\gradle-wrapper.jar`

### Build fails
- Check the error messages in the console
- Look for build reports in: `build\reports\problems\`
- Make sure Java 17+ is installed

