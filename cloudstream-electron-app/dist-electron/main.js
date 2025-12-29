"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (require('electron-squirrel-startup')) {
        electron_1.app.quit();
    }
}
catch {
    // electron-squirrel-startup is optional, only needed for Windows installers
}
let mainWindow = null;
let jvmBridgeProcess = null;
const JVM_BRIDGE_PORT = 8765;
const PLUGINS_DIR = path_1.default.join(electron_1.app.getPath('userData'), 'plugins');
const createWindow = () => {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Remove the default menu bar completely
        autoHideMenuBar: true,
    });
    // Remove the menu bar entirely (File, Edit, View, etc.)
    mainWindow.setMenuBarVisibility(false);
    // In production, load the index.html from the dist folder.
    // In development, load from the Vite dev server.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3001');
        // DevTools can be opened manually with Ctrl+Shift+I or F12 if needed
        // mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
electron_1.app.whenReady().then(() => {
    // Ensure plugins directory exists
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }
    // Start JVM bridge (if available)
    startJvmBridge();
    createWindow();
    electron_1.app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed, except on macOS.
electron_1.app.on('window-all-closed', () => {
    // Stop JVM bridge when app quits
    stopJvmBridge();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Cleanup on app quit
electron_1.app.on('before-quit', () => {
    stopJvmBridge();
});
/**
 * Start JVM bridge process
 */
function startJvmBridge() {
    try {
        // Try multiple possible locations for the bridge JAR
        const possiblePaths = [
            path_1.default.join(__dirname, '../../jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
            path_1.default.join(process.cwd(), 'jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
            path_1.default.join(electron_1.app.getAppPath(), 'jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
        ];
        let bridgeJar = null;
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                bridgeJar = possiblePath;
                break;
            }
        }
        // Check if bridge JAR exists
        if (!bridgeJar) {
            console.warn('JVM bridge JAR not found. Plugins will not work until bridge is built.');
            console.warn('To build the bridge, run: cd jvm-bridge && ./gradlew build');
            console.warn('Searched locations:');
            possiblePaths.forEach(p => console.warn(`  - ${p}`));
            return;
        }
        // Start bridge process
        console.log(`Starting JVM bridge from: ${bridgeJar}`);
        jvmBridgeProcess = (0, child_process_1.spawn)('java', ['-jar', bridgeJar, String(JVM_BRIDGE_PORT)], {
            cwd: path_1.default.dirname(bridgeJar),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32' // Use shell on Windows
        });
        jvmBridgeProcess.stdout?.on('data', (data) => {
            console.log(`[JVM Bridge] ${data}`);
        });
        jvmBridgeProcess.stderr?.on('data', (data) => {
            console.error(`[JVM Bridge Error] ${data}`);
        });
        jvmBridgeProcess.on('exit', (code) => {
            console.log(`JVM bridge exited with code ${code}`);
            jvmBridgeProcess = null;
        });
        console.log('JVM bridge started on port', JVM_BRIDGE_PORT);
    }
    catch (error) {
        console.error('Failed to start JVM bridge:', error);
    }
}
/**
 * Stop JVM bridge process
 */
function stopJvmBridge() {
    if (jvmBridgeProcess) {
        jvmBridgeProcess.kill();
        jvmBridgeProcess = null;
        console.log('JVM bridge stopped');
    }
}
/**
 * IPC handlers for plugin file operations
 */
electron_1.ipcMain.handle('save-plugin-file', async (event, pluginId, repositoryUrl, data) => {
    try {
        // Create directory structure similar to Android app
        const sanitize = (name) => {
            return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
        };
        const repoFolder = sanitize(repositoryUrl);
        const pluginFile = sanitize(pluginId) + '.cs3';
        const pluginDir = path_1.default.join(PLUGINS_DIR, repoFolder);
        const pluginPath = path_1.default.join(pluginDir, pluginFile);
        // Ensure directory exists
        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir, { recursive: true });
        }
        // Write file
        const buffer = Buffer.from(data);
        fs.writeFileSync(pluginPath, buffer);
        return { success: true, path: pluginPath };
    }
    catch (error) {
        console.error('Failed to save plugin file:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
electron_1.ipcMain.handle('get-plugin-path', (event, pluginId, repositoryUrl) => {
    const sanitize = (name) => {
        return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    };
    const repoFolder = sanitize(repositoryUrl);
    const pluginFile = sanitize(pluginId) + '.cs3';
    return path_1.default.join(PLUGINS_DIR, repoFolder, pluginFile);
});
electron_1.ipcMain.handle('plugin-file-exists', (event, pluginId, repositoryUrl) => {
    const sanitize = (name) => {
        return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    };
    const repoFolder = sanitize(repositoryUrl);
    const pluginFile = sanitize(pluginId) + '.cs3';
    const pluginPath = path_1.default.join(PLUGINS_DIR, repoFolder, pluginFile);
    return fs.existsSync(pluginPath);
});
// Example IPC handler
electron_1.ipcMain.handle('ping', () => 'pong');
//# sourceMappingURL=main.js.map