import { WebContentsView, WebContents } from "electron";

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  faviconUrl?: string;
}

export interface TabCallbacks {
  onTabsChanged: (tabs: TabInfo[], activeId: number) => void;
  onActiveTabChanged: (tab: TabInfo) => void;
  onUrlChanged: (url: string) => void;
  onTitleChanged: (title: string) => void;
  onTabCreated?: (webContents: WebContents) => void;
}

interface Tab {
  id: number;
  view: WebContentsView;
  title: string;
  url: string;
  faviconUrl?: string;
}

let nextTabId = 1;

export class TabManager {
  private tabs: Map<number, Tab> = new Map();
  private activeTabId: number = -1;
  private callbacks: TabCallbacks;

  constructor(callbacks: TabCallbacks) {
    this.callbacks = callbacks;
  }

  createTab(url: string): Tab {
    const id = nextTabId++;
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const tab: Tab = { id, view, title: "New Tab", url };
    this.tabs.set(id, tab);

    view.webContents.on("did-navigate", (_event, newUrl) => {
      tab.url = newUrl;
      if (tab.id === this.activeTabId) {
        this.callbacks.onUrlChanged(newUrl);
      }
      this.broadcastTabs();
    });

    view.webContents.on("did-navigate-in-page", (_event, newUrl) => {
      tab.url = newUrl;
      if (tab.id === this.activeTabId) {
        this.callbacks.onUrlChanged(newUrl);
      }
      this.broadcastTabs();
    });

    view.webContents.on("page-title-updated", (_event, title) => {
      tab.title = title;
      if (tab.id === this.activeTabId) {
        this.callbacks.onTitleChanged(title);
      }
      this.broadcastTabs();
    });

    view.webContents.on("page-favicon-updated", (_event, favicons) => {
      if (favicons.length > 0) {
        tab.faviconUrl = favicons[0];
        this.broadcastTabs();
      }
    });

    view.webContents.setWindowOpenHandler(({ url: openUrl }) => {
      const newTab = this.createTab(openUrl);
      this.switchTab(newTab.id);
      newTab.view.webContents.loadURL(openUrl);
      return { action: "deny" };
    });

    this.callbacks.onTabCreated?.(view.webContents);
    view.webContents.loadURL(url);
    return tab;
  }

  switchTab(id: number): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    this.activeTabId = id;
    this.callbacks.onActiveTabChanged(this.getTabInfo(tab));
    this.callbacks.onUrlChanged(tab.url);
    this.callbacks.onTitleChanged(tab.title);
    this.broadcastTabs();
  }

  closeTab(id: number): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    this.tabs.delete(id);

    // If closing the active tab, switch to another
    if (id === this.activeTabId) {
      const remaining = Array.from(this.tabs.keys());
      if (remaining.length > 0) {
        this.switchTab(remaining[remaining.length - 1]);
      } else {
        // Last tab closed — create a replacement
        const newTab = this.createTab("https://posthog.com");
        this.switchTab(newTab.id);
      }
    }

    tab.view.webContents.close();
    this.broadcastTabs();
  }

  getActiveTab(): Tab | undefined {
    return this.tabs.get(this.activeTabId);
  }

  getActiveView(): WebContentsView | undefined {
    return this.getActiveTab()?.view;
  }

  getAllTabInfos(): TabInfo[] {
    return Array.from(this.tabs.values()).map((t) => this.getTabInfo(t));
  }

  getActiveTabId(): number {
    return this.activeTabId;
  }

  getViewForTab(id: number): WebContentsView | undefined {
    return this.tabs.get(id)?.view;
  }

  destroyAll(): void {
    for (const tab of this.tabs.values()) {
      tab.view.webContents.close();
    }
    this.tabs.clear();
  }

  private getTabInfo(tab: Tab): TabInfo {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      faviconUrl: tab.faviconUrl,
    };
  }

  private broadcastTabs(): void {
    this.callbacks.onTabsChanged(this.getAllTabInfos(), this.activeTabId);
  }
}
