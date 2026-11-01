const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('searchView', {
  search: query => ipcRenderer.invoke('search:query', query),
  back: () => ipcRenderer.invoke('search:back'),
  select: () => ipcRenderer.invoke('search:select'),
  onLocation: callback => { const handler = (_event, value) => callback(value); ipcRenderer.on('search:location', handler); return () => ipcRenderer.removeListener('search:location', handler); }
});
