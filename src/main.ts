import {
  app,
  BaseWindow,
  WebContentsView,
  dialog,
  ipcMain,
  Menu,
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
let chromeView: WebContentsView;
let tabManager: TabManager;
let sidebarVisible = true;

const TOOLBAR_HEIGHT = 44;
const SIDEBAR_WIDTH = 220;

function updateLayout(): void {
  const { width, height } = mainWindow.getContentBounds();
  const sidebarW = sidebarVisible ? SIDEBAR_WIDTH : 0;

  // Chrome view covers the full window
  chromeView.setBounds({ x: 0, y: 0, width, height });

  // Tab views sit behind the chrome view, offset by toolbar and sidebar
  const activeView = tabManager?.getActiveView();
  if (activeView) {
    activeView.setBounds({
      x: sidebarW,
      y: TOOLBAR_HEIGHT,
      width: width - sidebarW,
      height: height - TOOLBAR_HEIGHT,
    });
  }
}

function setActiveTabView(view: WebContentsView): void {
  // Remove all tab views (keep chromeView)
  const children = mainWindow.contentView.children;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child !== chromeView) {
      mainWindow.contentView.removeChildView(child);
    }
  }

  // Add tab view on top of chrome view (chrome is behind, but toolbar/sidebar
  // aren't covered by the tab view since it's offset by toolbar height + sidebar width)
  mainWindow.contentView.addChildView(view);
  updateLayout();
}

function broadcastTabsToChrome(tabs: TabInfo[], activeId: number): void {
  const chromeTabs = tabs.map((t) => ({ ...t, active: t.id === activeId }));
  chromeView.webContents.send('tabs-updated', chromeTabs);
}

function loadChromeView(): void {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    chromeView.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    chromeView.webContents.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
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
          click: () => chromeView.webContents.send('show-overlay', 'new-tab', ''),
        },
        {
          label: 'Close Tab',
          accelerator: 'CommandOrControl+W',
          click: () => {
            const activeId = tabManager?.getActiveTabId();
            if (activeId !== undefined && activeId >= 0)
              tabManager.closeTab(activeId);
          },
        },
        {
          label: 'Focus URL Bar',
          accelerator: 'CommandOrControl+L',
          click: () => chromeView.webContents.send('focus-url-bar'),
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
            chromeView.webContents.send('toggle-sidebar');
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

  chromeView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'chrome-preload.js'),
      transparent: true,
    },
  });
  chromeView.setBackgroundColor('#00000000');
  mainWindow.contentView.addChildView(chromeView);

  tabManager = new TabManager({
    onTabsChanged: broadcastTabsToChrome,
    onActiveTabChanged: () => {
      const view = tabManager.getActiveView();
      if (view) setActiveTabView(view);
    },
    onUrlChanged: (url) => {
      chromeView.webContents.send('url-changed', url);
    },
    onTitleChanged: (title) => {
      mainWindow.setTitle(`${title} - hogium`);
    },
    onLastTabClosed: () => {
      // Remove any leftover tab views
      const children = mainWindow.contentView.children;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child !== chromeView) {
          mainWindow.contentView.removeChildView(child);
        }
      }
      chromeView.webContents.send('show-overlay', 'new-tab', '');
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
        chromeView.webContents.send('loading', true);
      });
      webContents.on('did-stop-loading', () => {
        chromeView.webContents.send('loading', false);
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

  loadChromeView();

  // Show new tab overlay on launch (sent after chrome view loads)
  chromeView.webContents.once('did-finish-load', () => {
    chromeView.webContents.send('show-overlay', 'new-tab', '');
    updateLayout();
  });

  mainWindow.on('closed', () => {
    tabManager.destroyAll();
    chromeView.webContents.close();
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
  chromeView.webContents.send('show-overlay', 'new-tab', '');
});

ipcMain.on('new-tab-submit', (_event, url: string, mode: string) => {
  if (mode === 'navigate') {
    tabManager?.getActiveView()?.webContents.loadURL(url);
  } else {
    const tab = tabManager.createTab(url);
    tabManager.switchTab(tab.id);
  }
});

ipcMain.on('open-address-bar', () => {
  const activeView = tabManager?.getActiveView();
  const url = activeView?.webContents.getURL() ?? '';
  chromeView.webContents.send('show-overlay', 'navigate', url);
});

ipcMain.on('new-tab-cancel', () => {
  // Nothing to do on main side - renderer handles overlay hide
});

ipcMain.on('close-tab', (_event, id: number) => {
  tabManager.closeTab(id);
});

ipcMain.on('switch-tab', (_event, id: number) => {
  tabManager.switchTab(id);
});

// IPC: sidebar visibility
ipcMain.on('sidebar-visibility-changed', (_event, visible: boolean) => {
  sidebarVisible = visible;
  updateLayout();
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
  const tab = tabManager.createTab(url);
  tabManager.switchTab(tab.id);
});

// IPC: overlay visibility (reorder views so chromeView is on top when overlay shows)
ipcMain.on('overlay-visibility-changed', (_event, visible: boolean) => {
  if (visible) {
    // Bring chrome view to front so overlay can receive clicks
    mainWindow.contentView.removeChildView(chromeView);
    mainWindow.contentView.addChildView(chromeView);
  } else {
    // Put chrome view behind tab views
    const tabView = tabManager?.getActiveView();
    if (tabView) {
      mainWindow.contentView.removeChildView(tabView);
      mainWindow.contentView.addChildView(tabView);
    }
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
