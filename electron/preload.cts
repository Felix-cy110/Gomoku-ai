import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  getHealth: () => ipcRenderer.invoke('lobby:health'),
});
