"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => electron_1.ipcRenderer.invoke('ping'),
    // Plugin file operations
    savePluginFile: (pluginId, repositoryUrl, data) => electron_1.ipcRenderer.invoke('save-plugin-file', pluginId, repositoryUrl, data),
    getPluginPath: (pluginId, repositoryUrl) => electron_1.ipcRenderer.invoke('get-plugin-path', pluginId, repositoryUrl),
    pluginFileExists: (pluginId, repositoryUrl) => electron_1.ipcRenderer.invoke('plugin-file-exists', pluginId, repositoryUrl),
});
//# sourceMappingURL=preload.js.map