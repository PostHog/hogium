import { create } from 'zustand';

interface SidebarTab {
  id: number;
  title: string;
  url: string;
  faviconUrl?: string;
  active: boolean;
}

interface OverlayState {
  visible: boolean;
  mode: 'new-tab' | 'navigate';
  prefillUrl: string;
}

interface ChromeState {
  // Toolbar
  currentUrl: string;
  loading: boolean;

  // Sidebar
  tabs: SidebarTab[];
  sidebarVisible: boolean;
  activePanel: 'tabs' | 'history';

  // Overlay
  overlay: OverlayState;

  // State setters (called from IPC listeners in app.tsx)
  setCurrentUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setTabs: (tabs: SidebarTab[]) => void;
  setSidebarVisible: (visible: boolean) => void;
  setActivePanel: (panel: 'tabs' | 'history') => void;
  showOverlay: (mode: 'new-tab' | 'navigate', prefillUrl?: string) => void;
  hideOverlay: () => void;

  // IPC actions (thin wrappers around window.hogium calls)
  navigate: (url: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  newTab: () => void;
  closeTab: (id: number) => void;
  switchTab: (id: number) => void;
  submitOverlay: (url: string) => void;
  cancelOverlay: () => void;
  openUrl: (url: string) => void;
  searchHistory: (query: string) => Promise<HistoryEntry[]>;
  getRecentHistory: () => Promise<HistoryEntry[]>;
  deleteHistoryEntry: (id: number) => void;
}

export const useChromeStore = create<ChromeState>((set, get) => ({
  currentUrl: '',
  loading: false,
  tabs: [],
  sidebarVisible: true,
  activePanel: 'tabs',
  overlay: { visible: false, mode: 'new-tab', prefillUrl: '' },

  setCurrentUrl: (url) => set({ currentUrl: url }),
  setLoading: (loading) => set({ loading }),
  setTabs: (tabs) => set({ tabs }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  showOverlay: (mode, prefillUrl = '') =>
    set({ overlay: { visible: true, mode, prefillUrl } }),
  hideOverlay: () =>
    set({ overlay: { visible: false, mode: 'new-tab', prefillUrl: '' } }),

  // IPC actions
  navigate: (url) => window.hogium.navigate(url),
  back: () => window.hogium.back(),
  forward: () => window.hogium.forward(),
  refresh: () => window.hogium.refresh(),
  newTab: () => window.hogium.newTab(),
  closeTab: (id) => window.hogium.closeTab(id),
  switchTab: (id) => window.hogium.switchTab(id),
  submitOverlay: (url) => {
    const mode = get().overlay.mode;
    set({ overlay: { visible: false, mode: 'new-tab', prefillUrl: '' } });
    window.hogium.submitOverlay(url, mode);
  },
  cancelOverlay: () => {
    if (get().tabs.length === 0) return;
    set({ overlay: { visible: false, mode: 'new-tab', prefillUrl: '' } });
    window.hogium.cancelOverlay();
  },
  openUrl: (url) => window.hogium.openUrl(url),
  searchHistory: (query) => window.hogium.searchHistory(query),
  getRecentHistory: () => window.hogium.getRecentHistory(),
  deleteHistoryEntry: (id) => window.hogium.deleteHistoryEntry(id),
}));

// Wire IPC listeners from main process to store actions (call once on app init)
export function initIpcListeners(): void {
  const { setCurrentUrl, setLoading, setTabs, showOverlay, setSidebarVisible } =
    useChromeStore.getState();

  window.hogium.onUrlChanged((url) => setCurrentUrl(url));
  window.hogium.onLoading((loading) => setLoading(loading));
  window.hogium.onTabsUpdated((tabs) => setTabs(tabs));
  window.hogium.onShowOverlay((mode, prefillUrl) => {
    showOverlay(mode as 'new-tab' | 'navigate', prefillUrl);
  });
  window.hogium.onFocusUrlBar(() => {
    window.hogium.openAddressBar();
  });
  window.hogium.onToggleSidebar(() => {
    const current = useChromeStore.getState().sidebarVisible;
    const next = !current;
    setSidebarVisible(next);
    window.hogium.sidebarVisibilityChanged(next);
  });

  // Sync overlay visibility to main process for view z-ordering
  let prevOverlayVisible = useChromeStore.getState().overlay.visible;
  useChromeStore.subscribe((state) => {
    if (state.overlay.visible !== prevOverlayVisible) {
      prevOverlayVisible = state.overlay.visible;
      window.hogium.overlayVisibilityChanged(state.overlay.visible);
    }
  });
}
