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
    navigate: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    newTab: () => void;
    onUrlChanged: (callback: (url: string) => void) => void;
    onLoading: (callback: (loading: boolean) => void) => void;
    onFocusUrlBar: (callback: () => void) => void;
    openAddressBar: () => void;
  }

  interface HogiumSidebarBridge {
    newTab: () => void;
    closeTab: (id: number) => void;
    switchTab: (id: number) => void;
    startWindowDrag: () => void;
    stopWindowDrag: () => void;
    toggleMaximize: () => void;
    onTabsUpdated: (callback: (tabs: SidebarTab[]) => void) => void;
    searchHistory: (query: string) => Promise<HistoryEntry[]>;
    getRecentHistory: () => Promise<HistoryEntry[]>;
    deleteHistoryEntry: (id: number) => void;
    clearHistory: () => void;
    openUrl: (url: string) => void;
  }

  interface HogiumNewTabBridge {
    submit: (url: string) => void;
    cancel: () => void;
    onShow: (callback: (prefillUrl: string) => void) => void;
    searchHistory: (query: string) => Promise<HistoryEntry[]>;
    getRecentHistory: () => Promise<HistoryEntry[]>;
  }

  interface Window {
    hogium: HogiumBridge;
    hogiumSidebar: HogiumSidebarBridge;
    hogiumNewTab: HogiumNewTabBridge;
  }
}
