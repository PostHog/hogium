import { contextBridge, ipcRenderer } from "electron";

export interface SidebarTab {
  id: number;
  title: string;
  url: string;
  faviconUrl?: string;
  active: boolean;
}

contextBridge.exposeInMainWorld("hogiumSidebar", {
  newTab: () => ipcRenderer.send("new-tab"),
  closeTab: (id: number) => ipcRenderer.send("close-tab", id),
  switchTab: (id: number) => ipcRenderer.send("switch-tab", id),
  startWindowDrag: () => ipcRenderer.send("start-window-drag"),
  stopWindowDrag: () => ipcRenderer.send("stop-window-drag"),
  toggleMaximize: () => ipcRenderer.send("toggle-maximize"),
  onTabsUpdated: (callback: (tabs: SidebarTab[]) => void) => {
    ipcRenderer.on("tabs-updated", (_event, tabs: SidebarTab[]) =>
      callback(tabs),
    );
  },
});
