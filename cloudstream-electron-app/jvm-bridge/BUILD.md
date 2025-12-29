# Building the JVM Bridge

## Prerequisites

- Java 17 or higher
- Gradle (will be downloaded automatically via wrapper)

## Building

### Windows
```bash
cd jvm-bridge
gradlew.bat build
```

### Linux/Mac
```bash
cd jvm-bridge
chmod +x gradlew
./gradlew build
```

The JAR file will be created at:
`jvm-bridge/build/libs/jvm-bridge-1.0.0.jar`

## Running Manually

After building, you can test the bridge manually:

```bash
java -jar build/libs/jvm-bridge-1.0.0.jar [port]
```

Default port is 8765.

## Integration with Electron

The Electron app will automatically:
1. Look for the JAR in several locations
2. Start the bridge process when the app launches
3. Stop the bridge when the app quits

If the JAR is not found, the app will still run but plugins won't work.

