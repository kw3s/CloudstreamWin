# JVM Bridge Implementation Status

## Overview
Cloudstream plugins are compiled Kotlin files (`.cs3` format, which are DEX/Android bytecode files). To run these in Electron, we need a JVM bridge that can execute DEX files.

## Current Implementation

### ✅ Completed
1. **Plugin Detection**: The system now detects DEX/binary plugins vs JavaScript plugins
2. **Plugin Download**: Plugins are downloaded and stored (currently in localStorage as base64, needs file system storage)
3. **JVM Bridge Service**: Created `jvmBridge.ts` service with infrastructure for:
   - Plugin downloading and storage
   - Plugin loading interface
   - Search/Load method interfaces
4. **Plugin Loader Integration**: Updated `pluginLoader.ts` to route DEX files to JVM bridge instead of rejecting them
5. **Proxy API**: Creates proxy MainAPI instances that communicate with JVM bridge

### ⚠️ Needs Implementation

#### 1. JVM Bridge Process
The actual JVM execution needs to be implemented. Options:

**Option A: Node.js JVM Bridge Library**
- Use `java` npm package or similar to interface with JVM
- Pros: Direct integration
- Cons: Requires JVM installed, complex setup

**Option B: Separate Java/Kotlin Process**
- Create a Java/Kotlin application that:
  - Loads DEX files using PathClassLoader (or DEX-to-JAR converter)
  - Exposes HTTP/WebSocket API for plugin execution
  - Communicates with Electron via IPC/HTTP
- Pros: Clean separation, can use Android-compatible code
- Cons: Requires separate process management

**Option C: GraalVM**
- Use GraalVM to run JVM code in Node.js
- Pros: Single process
- Cons: Large binary, complex setup

**Recommended: Option B** - Separate Java/Kotlin process with HTTP API

#### 2. File System Storage
Currently plugins are stored in localStorage (base64). Need to:
- Use Electron's main process to save files to disk
- Store in `plugins/` directory (similar to Android app)
- Implement IPC handlers in `electron/main.ts`

#### 3. DEX File Loading
Need to implement:
- Extract `manifest.json` from `.cs3` file (it's a ZIP/APK-like structure)
- Load DEX classes using PathClassLoader or equivalent
- Instantiate plugin class
- Call `plugin.load()` method
- Register MainAPI instances returned by plugin

#### 4. Plugin Execution
Implement methods:
- `search(pluginId, query)`: Execute plugin's search method
- `load(pluginId, url)`: Execute plugin's load method
- Return results in Cloudstream format

## Architecture

```
┌─────────────────┐
│  Electron App   │
│  (Renderer)     │
└────────┬────────┘
         │ IPC/HTTP
         │
┌────────▼────────┐
│  JVM Bridge     │
│  (Java/Kotlin)  │
│  - Loads DEX    │
│  - Executes     │
│  - Returns JSON │
└─────────────────┘
```

## Next Steps

1. **Create Java/Kotlin Bridge Application**
   - Set up project structure
   - Implement DEX file loader
   - Create HTTP API for plugin operations
   - Handle plugin lifecycle (load/unload)

2. **Implement File System Storage**
   - Add IPC handlers in `electron/main.ts`
   - Save plugins to `plugins/` directory
   - Update `jvmBridge.ts` to use IPC

3. **Complete Plugin Execution**
   - Implement search/load methods
   - Convert plugin responses to Cloudstream format
   - Handle errors and edge cases

4. **Testing**
   - Test with actual Cloudstream plugins
   - Verify search and load functionality
   - Performance testing

## Current Workaround

Until the JVM bridge is fully implemented, the system will:
- Download and store DEX plugins
- Show appropriate error messages
- Allow Stremio add-ons to work (which don't need JVM)

## Notes

- DEX files are Android-specific bytecode
- They need to be converted to JAR or loaded in an Android-compatible runtime
- The `.cs3` files are ZIP archives containing DEX files and resources
- Plugins contain a `manifest.json` that describes the plugin class to load

