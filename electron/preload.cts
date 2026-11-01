import { contextBridge, ipcRenderer } from 'electron';
import type { AnalysisRequest, MoveRequest } from '../shared/analysis.js';

contextBridge.exposeInMainWorld('desktop', {
  getHealth: () => ipcRenderer.invoke('lobby:health'),
  analysis: {
    getStatus: () => ipcRenderer.invoke('analysis:status'),
    analyze: (request: AnalysisRequest) => ipcRenderer.invoke('analysis:position', request),
    bestMove: (request: MoveRequest) => ipcRenderer.invoke('analysis:move', request),
    cancel: (id: string) => ipcRenderer.invoke('analysis:cancel', id),
    restart: () => ipcRenderer.invoke('analysis:restart'),
  },
});
