interface SidebarTab {
  id: number;
  title: string;
  url: string;
  faviconUrl?: string;
  active: boolean;
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
}

interface HogiumSidebarBridge {
  newTab: () => void;
  closeTab: (id: number) => void;
  switchTab: (id: number) => void;
  startWindowDrag: () => void;
  stopWindowDrag: () => void;
  toggleMaximize: () => void;
  onTabsUpdated: (callback: (tabs: SidebarTab[]) => void) => void;
}

interface HogiumNewTabBridge {
  submit: (url: string) => void;
  cancel: () => void;
  onShow: (callback: () => void) => void;
}

declare global {
  interface Window {
    hogium: HogiumBridge;
    hogiumSidebar: HogiumSidebarBridge;
    hogiumNewTab: HogiumNewTabBridge;
  }
}

export {};
