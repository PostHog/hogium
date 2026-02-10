import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hogium', {
  // Navigation
  navigate: (url: string) => ipcRenderer.send('navigate', url),
  back: () => ipcRenderer.send('back'),
  forward: () => ipcRenderer.send('forward'),
  refresh: () => ipcRenderer.send('refresh'),
  openAddressBar: () => ipcRenderer.send('open-address-bar'),

  // Tabs
  newTab: () => ipcRenderer.send('new-tab'),
  closeTab: (id: number) => ipcRenderer.send('close-tab', id),
  switchTab: (id: number) => ipcRenderer.send('switch-tab', id),

  // Overlay
  submitOverlay: (url: string, mode: string) => ipcRenderer.send('new-tab-submit', url, mode),
  cancelOverlay: () => ipcRenderer.send('new-tab-cancel'),

  // Sidebar
  sidebarVisibilityChanged: (visible: boolean) =>
    ipcRenderer.send('sidebar-visibility-changed', visible),

  // History
  searchHistory: (query: string) => ipcRenderer.invoke('search-history', query),
  getRecentHistory: () => ipcRenderer.invoke('get-recent-history'),
  deleteHistoryEntry: (id: number) => ipcRenderer.send('delete-history-entry', id),
  clearHistory: () => ipcRenderer.send('clear-history'),
  openUrl: (url: string) => ipcRenderer.send('history-open-url', url),

  // Listeners (main → renderer)
  onUrlChanged: (callback: (url: string) => void) => {
    ipcRenderer.on('url-changed', (_event, url: string) => callback(url));
  },
  onLoading: (callback: (loading: boolean) => void) => {
    ipcRenderer.on('loading', (_event, loading: boolean) => callback(loading));
  },
  onTabsUpdated: (callback: (tabs: SidebarTab[]) => void) => {
    ipcRenderer.on('tabs-updated', (_event, tabs: SidebarTab[]) => callback(tabs));
  },
  onShowOverlay: (callback: (mode: string, prefillUrl: string) => void) => {
    ipcRenderer.on('show-overlay', (_event, mode: string, prefillUrl: string) =>
      callback(mode, prefillUrl),
    );
  },
  onFocusUrlBar: (callback: () => void) => {
    ipcRenderer.on('focus-url-bar', () => callback());
  },
  onToggleSidebar: (callback: () => void) => {
    ipcRenderer.on('toggle-sidebar', () => callback());
  },

  // Overlay visibility (for view z-ordering)
  overlayVisibilityChanged: (visible: boolean) => {
    ipcRenderer.send('overlay-visibility-changed', visible);
  },
});
