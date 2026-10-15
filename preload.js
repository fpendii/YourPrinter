const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printKasir', {
  selectPdf: () => ipcRenderer.invoke('file:select-pdf'),
  inspectPdf: (filePath) => ipcRenderer.invoke('pdf:inspect', filePath),
  readSettings: () => ipcRenderer.invoke('settings:read'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:write', settings),
  readTransactions: () => ipcRenderer.invoke('transactions:read'),
  addTransaction: (transaction) => ipcRenderer.invoke('transactions:add', transaction),
  onPdfProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('pdf:progress', listener);
    return () => ipcRenderer.removeListener('pdf:progress', listener);
  }
});
