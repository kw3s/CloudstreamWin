import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (require('electron-squirrel-startup')) {
        app.quit();
    }
} catch {
    // electron-squirrel-startup is optional, only needed for Windows installers
}

let mainWindow: BrowserWindow | null = null;
let jvmBridgeProcess: ChildProcess | null = null;
const JVM_BRIDGE_PORT = 8765;
const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins');

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
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
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    // Ensure plugins directory exists
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }

    // Start JVM bridge (if available)
    startJvmBridge();

    createWindow();

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    // Stop JVM bridge when app quits
    stopJvmBridge();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup on app quit
app.on('before-quit', () => {
    stopJvmBridge();
});

/**
 * Start JVM bridge process
 */
function startJvmBridge() {
    try {
        // Try multiple possible locations for the bridge JAR
        const possiblePaths = [
            path.join(__dirname, '../../jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
            path.join(process.cwd(), 'jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
            path.join(app.getAppPath(), 'jvm-bridge/build/libs/jvm-bridge-1.0.0.jar'),
        ];

        let bridgeJar: string | null = null;
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
        jvmBridgeProcess = spawn('java', ['-jar', bridgeJar, String(JVM_BRIDGE_PORT)], {
            cwd: path.dirname(bridgeJar),
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
    } catch (error) {
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
ipcMain.handle('save-plugin-file', async (event, pluginId: string, repositoryUrl: string, data: ArrayBuffer) => {
    try {
        // Create directory structure similar to Android app
        const sanitize = (name: string): string => {
            return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
        };

        const repoFolder = sanitize(repositoryUrl);
        const pluginFile = sanitize(pluginId) + '.cs3';
        const pluginDir = path.join(PLUGINS_DIR, repoFolder);
        const pluginPath = path.join(pluginDir, pluginFile);

        // Ensure directory exists
        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir, { recursive: true });
        }

        // Write file
        const buffer = Buffer.from(data);
        fs.writeFileSync(pluginPath, buffer);

        return { success: true, path: pluginPath };
    } catch (error) {
        console.error('Failed to save plugin file:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('get-plugin-path', (event, pluginId: string, repositoryUrl: string) => {
    const sanitize = (name: string): string => {
        return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    };

    const repoFolder = sanitize(repositoryUrl);
    const pluginFile = sanitize(pluginId) + '.cs3';
    return path.join(PLUGINS_DIR, repoFolder, pluginFile);
});

ipcMain.handle('plugin-file-exists', (event, pluginId: string, repositoryUrl: string) => {
    const sanitize = (name: string): string => {
        return name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    };

    const repoFolder = sanitize(repositoryUrl);
    const pluginFile = sanitize(pluginId) + '.cs3';
    const pluginPath = path.join(PLUGINS_DIR, repoFolder, pluginFile);
    return fs.existsSync(pluginPath);
});

// Example IPC handler
ipcMain.handle('ping', () => 'pong');
