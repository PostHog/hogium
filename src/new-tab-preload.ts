import { contextBridge, ipcRenderer } from 'electron';

// Buffer show-overlay events that arrive before the React listener registers
let pendingShow: string | null = null;
let showCallback: ((prefillUrl: string) => void) | null = null;

ipcRenderer.on('show-overlay', (_event, prefillUrl: string) => {
  if (showCallback) {
    showCallback(prefillUrl ?? '');
  } else {
    pendingShow = prefillUrl ?? '';
  }
});

contextBridge.exposeInMainWorld('hogiumNewTab', {
  submit: (url: string) => ipcRenderer.send('new-tab-submit', url),
  cancel: () => ipcRenderer.send('new-tab-cancel'),
  onShow: (callback: (prefillUrl: string) => void) => {
    showCallback = callback;
    if (pendingShow !== null) {
      callback(pendingShow);
      pendingShow = null;
    }
  },
  searchHistory: (query: string) => ipcRenderer.invoke('search-history', query),
  getRecentHistory: () => ipcRenderer.invoke('get-recent-history'),
});
