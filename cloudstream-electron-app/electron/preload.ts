import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => ipcRenderer.invoke('ping'),
    
    // Plugin file operations
    savePluginFile: (pluginId: string, repositoryUrl: string, data: ArrayBuffer) =>
        ipcRenderer.invoke('save-plugin-file', pluginId, repositoryUrl, data),
    
    getPluginPath: (pluginId: string, repositoryUrl: string) =>
        ipcRenderer.invoke('get-plugin-path', pluginId, repositoryUrl),
    
    pluginFileExists: (pluginId: string, repositoryUrl: string) =>
        ipcRenderer.invoke('plugin-file-exists', pluginId, repositoryUrl),
});
