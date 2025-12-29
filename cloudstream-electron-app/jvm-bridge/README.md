# Cloudstream JVM Bridge

This is a Java/Kotlin application that runs as a separate process to execute Cloudstream DEX plugins.

## Purpose

Cloudstream plugins are compiled Kotlin code in DEX format (Android bytecode). Electron cannot execute DEX files directly, so this bridge:
1. Loads `.cs3` plugin files (which are ZIP archives containing DEX files)
2. Extracts and loads DEX files
3. Instantiates plugin classes
4. Executes plugin methods (search, load)
5. Returns results via HTTP API

## Architecture

```
Electron App (Renderer)
    ↓ HTTP/WebSocket
JVM Bridge (This Application)
    ↓ Loads DEX
Cloudstream Plugins
```

## Building

```bash
cd jvm-bridge
./gradlew build
```

## Running

```bash
./gradlew run
# Or
java -jar build/libs/jvm-bridge-1.0.0.jar [port]
```

Default port: 8765

## API Endpoints

### Health Check
```
GET /health
```

### Load Plugin
```
POST /plugin/load
Body: {
  "pluginPath": "/path/to/plugin.cs3",
  "pluginId": "plugin-internal-name",
  "repositoryUrl": "https://..."
}
```

### Search
```
POST /plugin/search
Body: {
  "pluginId": "plugin-internal-name",
  "query": "search query"
}
```

### Load Content
```
POST /plugin/load-content
Body: {
  "pluginId": "plugin-internal-name",
  "url": "content-url"
}
```

### Unload Plugin
```
DELETE /plugin/{pluginId}
```

### List Plugins
```
GET /plugins
```

## TODO

- [ ] Implement DEX file loading (requires Android SDK tools or DEX-to-JAR conversion)
- [ ] Implement plugin class instantiation
- [ ] Implement MainAPI registration
- [ ] Implement search/load method execution
- [ ] Add error handling and logging
- [ ] Add plugin lifecycle management

## Dependencies

- Kotlin 1.9.20
- Ktor (HTTP server)
- Gson (JSON parsing)
- Java 17+

## Notes

DEX files are Android-specific bytecode. To load them in a standard JVM, we need to either:
1. Convert DEX to JAR (using tools like `d8` or `dx`)
2. Use an Android-compatible runtime
3. Use a DEX classloader library

This is a work in progress.

