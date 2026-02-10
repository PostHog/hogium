import {
  app,
  BaseWindow,
  WebContentsView,
  dialog,
  ipcMain,
  Menu,
  screen,
  nativeTheme,
} from 'electron';
import path from 'node:path';
import { TabManager, TabInfo } from './tab-manager';
import {
  getDatabase,
  closeDatabase,
  clearDatabase,
  recordVisit,
  searchHistory,
  getRecentHistory,
  updateFaviconForUrl,
  deleteHistoryEntry,
  clearHistory,
} from './db';

let mainWindow: BaseWindow;
let toolbarView: WebContentsView;
let sidebarView: WebContentsView;
let overlayView: WebContentsView;
let tabManager: TabManager;
let sidebarVisible = true;
let overlayVisible = false;

const TOOLBAR_HEIGHT = 44;
const SIDEBAR_WIDTH = 220;

function loadView(view: WebContentsView, viewName: string, extraParams?: Record<string, string>): void {
  const params = new URLSearchParams({ view: viewName, ...extraParams });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    view.webContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${params}`);
  } else {
    view.webContents.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: params.toString() }
    );
  }
}

function updateLayout(): void {
  const { width, height } = mainWindow.getContentBounds();
  const sidebarW = sidebarVisible ? SIDEBAR_WIDTH : 0;

  toolbarView.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT });

  if (sidebarVisible) {
    sidebarView.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width: SIDEBAR_WIDTH,
      height: height - TOOLBAR_HEIGHT,
    });
  } else {
    sidebarView.setBounds({ x: -SIDEBAR_WIDTH, y: 0, width: 0, height: 0 });
  }

  const activeView = tabManager?.getActiveView();
  if (activeView) {
    activeView.setBounds({
      x: sidebarW,
      y: TOOLBAR_HEIGHT,
      width: width - sidebarW,
      height: height - TOOLBAR_HEIGHT,
    });
  }

  if (overlayView) {
    overlayView.setBounds({
      x: sidebarW,
      y: TOOLBAR_HEIGHT,
      width: width - sidebarW,
      height: height - TOOLBAR_HEIGHT,
    });
  }
}

function setActiveTabView(view: WebContentsView): void {
  const children = mainWindow.contentView.children;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child !== toolbarView && child !== sidebarView && child !== overlayView) {
      mainWindow.contentView.removeChildView(child);
    }
  }

  mainWindow.contentView.addChildView(view);
  // Keep overlay on top if visible
  if (overlayVisible && overlayView) {
    mainWindow.contentView.removeChildView(overlayView);
    mainWindow.contentView.addChildView(overlayView);
  }
  updateLayout();
}

function showNewTabOverlay(): void {
  if (overlayVisible) return;
  overlayVisible = true;
  mainWindow.contentView.addChildView(overlayView);
  updateLayout();
  overlayView.webContents.focus();
  overlayView.webContents.send('show-overlay');
}

function hideNewTabOverlay(): void {
  if (!overlayVisible) return;
  overlayVisible = false;
  mainWindow.contentView.removeChildView(overlayView);
}

function broadcastTabsToSidebar(tabs: TabInfo[], activeId: number): void {
  const sidebarTabs = tabs.map((t) => ({ ...t, active: t.id === activeId }));
  sidebarView.webContents.send('tabs-updated', sidebarTabs);
}

function setupApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CommandOrControl+T',
          click: () => showNewTabOverlay(),
        },
        {
          label: 'Close Tab',
          accelerator: 'CommandOrControl+W',
          click: () => {
            if (overlayVisible) {
              // Don't dismiss if there are no tabs
              if (tabManager?.getActiveTabId() >= 0) hideNewTabOverlay();
            } else {
              const activeId = tabManager?.getActiveTabId();
              if (activeId !== undefined && activeId >= 0)
                tabManager.closeTab(activeId);
            }
          },
        },
        {
          label: 'Focus URL Bar',
          accelerator: 'CommandOrControl+L',
          click: () => toolbarView.webContents.send('focus-url-bar'),
        },
        { type: 'separator' },
        {
          label: 'Clear Browsing Data',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Clear Data'],
              defaultId: 0,
              cancelId: 0,
              message: 'Clear all browsing data?',
              detail:
                'This will delete all stored data including bookmarks and history. This cannot be undone.',
            });
            if (response === 1) clearDatabase();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CommandOrControl+R',
          click: () => tabManager?.getActiveView()?.webContents.reload(),
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CommandOrControl+B',
          click: () => {
            sidebarVisible = !sidebarVisible;
            updateLayout();
          },
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'CommandOrControl+Alt+I',
          click: () => {
            const wc = tabManager?.getActiveView()?.webContents;
            if (wc) {
              if (wc.isDevToolsOpened()) wc.closeDevTools();
              else wc.openDevTools();
            }
          },
        },
        {
          label: 'Developer Tools (F12)',
          accelerator: 'F12',
          visible: false,
          click: () => {
            const wc = tabManager?.getActiveView()?.webContents;
            if (wc) {
              if (wc.isDevToolsOpened()) wc.closeDevTools();
              else wc.openDevTools();
            }
          },
        },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'CommandOrControl+[',
          click: () => {
            const wc = tabManager?.getActiveView()?.webContents;
            if (wc?.canGoBack()) wc.goBack();
          },
        },
        {
          label: 'Forward',
          accelerator: 'CommandOrControl+]',
          click: () => {
            const wc = tabManager?.getActiveView()?.webContents;
            if (wc?.canGoForward()) wc.goForward();
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  mainWindow = new BaseWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1E1F23' : '#EEEFE9',
  });

  toolbarView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  sidebarView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'sidebar-preload.js'),
    },
  });

  overlayView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'new-tab-preload.js'),
      transparent: true,
    },
  });
  overlayView.setBackgroundColor('#00000000');
  loadView(overlayView, 'new-tab-overlay');

  mainWindow.contentView.addChildView(toolbarView);
  mainWindow.contentView.addChildView(sidebarView);

  tabManager = new TabManager({
    onTabsChanged: broadcastTabsToSidebar,
    onActiveTabChanged: () => {
      const view = tabManager.getActiveView();
      if (view) setActiveTabView(view);
    },
    onUrlChanged: (url) => {
      toolbarView.webContents.send('url-changed', url);
    },
    onTitleChanged: (title) => {
      mainWindow.setTitle(`${title} - hogium`);
    },
    onLastTabClosed: () => {
      // Remove any leftover tab views
      const children = mainWindow.contentView.children;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child !== toolbarView && child !== sidebarView && child !== overlayView) {
          mainWindow.contentView.removeChildView(child);
        }
      }
      showNewTabOverlay();
    },
    onNavigated: (url, title) => {
      if (/^(data:|about:|devtools:|chrome:)/i.test(url)) return;
      recordVisit(url, title);
    },
    onFaviconChanged: (url, faviconUrl) => {
      updateFaviconForUrl(url, faviconUrl);
    },
    onTabCreated: (webContents) => {
      // Right-click context menu
      webContents.on('context-menu', (_event, params) => {
        const menuItems: Electron.MenuItemConstructorOptions[] = [];

        if (params.linkURL) {
          menuItems.push({
            label: 'Open Link in New Tab',
            click: () => {
              const tab = tabManager.createTab(params.linkURL);
              tabManager.switchTab(tab.id);
            },
          });
          menuItems.push({ type: 'separator' });
        }

        menuItems.push(
          {
            label: 'Back',
            click: () => webContents.goBack(),
            enabled: webContents.canGoBack(),
          },
          {
            label: 'Forward',
            click: () => webContents.goForward(),
            enabled: webContents.canGoForward(),
          },
          { label: 'Reload', click: () => webContents.reload() },
          { type: 'separator' },
          {
            label: 'Inspect Element',
            click: () => webContents.inspectElement(params.x, params.y),
          },
        );

        Menu.buildFromTemplate(menuItems).popup();
      });

      // Loading indicator
      webContents.on('did-start-loading', () => {
        toolbarView.webContents.send('loading', true);
      });
      webContents.on('did-stop-loading', () => {
        toolbarView.webContents.send('loading', false);
      });

      // Error pages
      webContents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription, validatedURL) => {
          if (errorCode === -3) return; // Aborted, ignore
          webContents.loadURL(
            `data:text/html,${encodeURIComponent(`
            <!DOCTYPE html>
            <html>
            <head><style>
              body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; color: #333; }
              .error { text-align: center; max-width: 500px; padding: 40px; }
              h1 { color: #1d4aff; font-size: 48px; margin-bottom: 8px; }
              h2 { margin-bottom: 16px; }
              p { color: #666; }
              code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
            </style></head>
            <body>
              <div class="error">
                <h1>🦔</h1>
                <h2>Page Not Found</h2>
                <p>Could not load <code>${validatedURL}</code></p>
                <p>${errorDescription} (${errorCode})</p>
              </div>
            </body>
            </html>
          `)}`,
          );
        },
      );
    },
  });

  mainWindow.on('resize', updateLayout);

  loadView(toolbarView, 'toolbar', { platform: process.platform });
  loadView(sidebarView, 'sidebar');

  // Show new tab overlay on launch (no tab created yet)
  showNewTabOverlay();

  mainWindow.on('closed', () => {
    tabManager.destroyAll();
    toolbarView.webContents.close();
    sidebarView.webContents.close();
    overlayView.webContents.close();
  });

  setupApplicationMenu();
}

// IPC: navigation
ipcMain.on('navigate', (_event, url: string) => {
  tabManager?.getActiveView()?.webContents.loadURL(url);
});

ipcMain.on('back', () => {
  const wc = tabManager?.getActiveView()?.webContents;
  if (wc?.canGoBack()) wc.goBack();
});

ipcMain.on('forward', () => {
  const wc = tabManager?.getActiveView()?.webContents;
  if (wc?.canGoForward()) wc.goForward();
});

ipcMain.on('refresh', () => {
  tabManager?.getActiveView()?.webContents.reload();
});

// IPC: tabs
ipcMain.on('new-tab', () => {
  showNewTabOverlay();
});

ipcMain.on('new-tab-submit', (_event, url: string) => {
  hideNewTabOverlay();
  const tab = tabManager.createTab(url);
  tabManager.switchTab(tab.id);
});

ipcMain.on('new-tab-cancel', () => {
  // Don't dismiss if there are no tabs — nowhere to go
  if (tabManager.getActiveTabId() < 0) return;
  hideNewTabOverlay();
});

ipcMain.on('close-tab', (_event, id: number) => {
  tabManager.closeTab(id);
});

ipcMain.on('switch-tab', (_event, id: number) => {
  tabManager.switchTab(id);
});

// IPC: history
ipcMain.handle('search-history', (_event, query: string) => {
  return searchHistory(query);
});

ipcMain.handle('get-recent-history', () => {
  return getRecentHistory();
});

ipcMain.on('delete-history-entry', (_event, id: number) => {
  deleteHistoryEntry(id);
});

ipcMain.on('clear-history', () => {
  clearHistory();
});

ipcMain.on('history-open-url', (_event, url: string) => {
  hideNewTabOverlay();
  const tab = tabManager.createTab(url);
  tabManager.switchTab(tab.id);
});

// IPC: window drag from sidebar
let dragInterval: ReturnType<typeof setInterval> | null = null;

ipcMain.on('start-window-drag', () => {
  if (dragInterval) return;
  if (mainWindow.isMaximized()) return;

  const cursor = screen.getCursorScreenPoint();
  const [winX, winY] = mainWindow.getPosition();
  const offsetX = cursor.x - winX;
  const offsetY = cursor.y - winY;

  dragInterval = setInterval(() => {
    const pos = screen.getCursorScreenPoint();
    mainWindow.setPosition(pos.x - offsetX, pos.y - offsetY);
  }, 16);
});

ipcMain.on('stop-window-drag', () => {
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
});

ipcMain.on('toggle-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

app.whenReady().then(() => {
  getDatabase();
  createWindow();
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BaseWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
