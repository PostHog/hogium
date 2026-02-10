export {};

declare global {
  interface SidebarTab {
    id: number;
    title: string;
    url: string;
    faviconUrl?: string;
    active: boolean;
  }

  interface HistoryEntry {
    id: number;
    url: string;
    title: string;
    faviconUrl?: string;
    visitedAt: string;
  }

  interface HogiumBridge {
    // Navigation
    navigate: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    openAddressBar: () => void;

    // Tabs
    newTab: () => void;
    closeTab: (id: number) => void;
    switchTab: (id: number) => void;

    // Overlay
    submitOverlay: (url: string, mode: string) => void;
    cancelOverlay: () => void;

    // Sidebar
    sidebarVisibilityChanged: (visible: boolean) => void;

    // History
    searchHistory: (query: string) => Promise<HistoryEntry[]>;
    getRecentHistory: () => Promise<HistoryEntry[]>;
    deleteHistoryEntry: (id: number) => void;
    clearHistory: () => void;
    openUrl: (url: string) => void;

    // Listeners
    onUrlChanged: (callback: (url: string) => void) => void;
    onLoading: (callback: (loading: boolean) => void) => void;
    onTabsUpdated: (callback: (tabs: SidebarTab[]) => void) => void;
    onShowOverlay: (callback: (mode: string, prefillUrl: string) => void) => void;
    onFocusUrlBar: (callback: () => void) => void;
    onToggleSidebar: (callback: () => void) => void;

    // Overlay visibility (for view z-ordering)
    overlayVisibilityChanged: (visible: boolean) => void;
  }

  interface Window {
    hogium: HogiumBridge;
  }
}
