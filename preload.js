const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  connectRadar: (userId) => ipcRenderer.send('connect-radar', userId),
  disconnectRadar: () => ipcRenderer.send('disconnect-radar'),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (_event, type, message) => callback(type, message))
});
