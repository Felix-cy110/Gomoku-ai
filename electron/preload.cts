import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  request: (method: 'GET' | 'PUT', path: string, body?: unknown) =>
    ipcRenderer.invoke('lobby:request', method, path, body),
});
