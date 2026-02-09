import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("hogium", {
  navigate: (url: string) => ipcRenderer.send("navigate", url),
  back: () => ipcRenderer.send("back"),
  forward: () => ipcRenderer.send("forward"),
  refresh: () => ipcRenderer.send("refresh"),
  newTab: () => ipcRenderer.send("new-tab"),
  toggleHedgehog: () => ipcRenderer.send("toggle-hedgehog"),
  onUrlChanged: (callback: (url: string) => void) => {
    ipcRenderer.on("url-changed", (_event, url: string) => callback(url));
  },
  onHedgehogState: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on("hedgehog-state", (_event, enabled: boolean) =>
      callback(enabled),
    );
  },
  onLoading: (callback: (loading: boolean) => void) => {
    ipcRenderer.on("loading", (_event, loading: boolean) =>
      callback(loading),
    );
  },
  onFocusUrlBar: (callback: () => void) => {
    ipcRenderer.on("focus-url-bar", () => callback());
  },
});
