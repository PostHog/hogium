import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hogiumNewTab', {
  submit: (url: string) => ipcRenderer.send('new-tab-submit', url),
  cancel: () => ipcRenderer.send('new-tab-cancel'),
  onShow: (callback: () => void) => {
    ipcRenderer.on('show-overlay', () => callback());
  },
});
