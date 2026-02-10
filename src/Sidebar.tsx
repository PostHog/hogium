import { useCallback, useEffect, useRef, useState } from 'react';

const PLUS_SVG = (
  <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 3a.75.75 0 0 1 .75.75v7.5h7.5a.75.75 0 0 1 0 1.5h-7.5v7.5a.75.75 0 0 1-1.5 0v-7.5h-7.5a.75.75 0 0 1 0-1.5h7.5v-7.5A.75.75 0 0 1 12 3Z"/></svg>
);

const CLOSE_SVG = (
  <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M4.75 3.69 12 10.94l7.25-7.25 1.06 1.06L13.06 12l7.25 7.25-1.06 1.06L12 13.06l-7.25 7.25-1.06-1.06L10.94 12 3.69 4.75l1.06-1.06Z"/></svg>
);

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

type Panel = 'tabs' | 'history';

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDate >= today) return 'Today';
  if (entryDate >= yesterday) return 'Yesterday';
  return 'Earlier';
}

function groupByDate(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const group = getDateGroup(entry.visitedAt);
    const list = groups.get(group);
    if (list) {
      list.push(entry);
    } else {
      groups.set(group, [entry]);
    }
  }
  return groups;
}

function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadHistory = useCallback(async (search?: string) => {
    const results = search
      ? await window.hogiumSidebar.searchHistory(search)
      : await window.hogiumSidebar.getRecentHistory();
    setEntries(results);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadHistory(value || undefined);
    }, 300);
  };

  const handleDelete = (id: number) => {
    window.hogiumSidebar.deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const grouped = groupByDate(entries);

  return (
    <div className="history-panel">
      <input
        className="history-search"
        type="text"
        placeholder="Search history…"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <div className="history-scroll">
        {entries.length === 0 && (
          <div className="history-empty">
            {query ? 'No results found' : 'No history yet'}
          </div>
        )}
        {Array.from(grouped.entries()).map(([group, items]) => (
          <div key={group} className="history-group">
            <div className="history-group-header">{group}</div>
            {items.map((entry) => (
              <div
                key={entry.id}
                className="history-entry"
                onClick={() => window.hogiumSidebar.openUrl(entry.url)}
              >
                {entry.faviconUrl ? (
                  <img
                    className="tab-favicon"
                    src={entry.faviconUrl}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="tab-favicon-placeholder" />
                )}
                <div className="history-entry-text">
                  <span className="history-entry-title">{entry.title || entry.url}</span>
                  <span className="history-entry-url">{entry.url}</span>
                </div>
                <button
                  className="tab-close history-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                >
                  {CLOSE_SVG}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [tabs, setTabs] = useState<SidebarTab[]>([]);
  const [panel, setPanel] = useState<Panel>('tabs');
  const draggingRef = useRef(false);

  useEffect(() => {
    window.hogiumSidebar.onTabsUpdated((updatedTabs) => {
      setTabs(updatedTabs);
    });
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.tab, .new-tab-btn, .tab-close, .panel-toggle, .history-search, .history-entry, .history-delete')) return;
      if (e.button !== 0) return;
      draggingRef.current = true;
      window.hogiumSidebar.startWindowDrag();
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        window.hogiumSidebar.stopWindowDrag();
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.tab, .new-tab-btn, .tab-close, .panel-toggle, .history-search, .history-entry, .history-delete')) return;
      if (draggingRef.current) {
        draggingRef.current = false;
        window.hogiumSidebar.stopWindowDrag();
      }
      window.hogiumSidebar.toggleMaximize();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('dblclick', handleDblClick);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('dblclick', handleDblClick);
    };
  }, []);

  return (
    <div data-view="sidebar">
      <div className="sidebar">
        {panel === 'tabs' ? (
          <>
            <button className="new-tab-btn" onClick={() => window.hogiumSidebar.newTab()}>
              {PLUS_SVG}
              <span>New Tab</span>
            </button>
            <div className="tab-scroll">
              <ul className="tab-list">
                {tabs.map((tab) => (
                  <li
                    key={tab.id}
                    className={'tab' + (tab.active ? ' active' : '')}
                    onClick={() => window.hogiumSidebar.switchTab(tab.id)}
                    onMouseDown={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        window.hogiumSidebar.closeTab(tab.id);
                      }
                    }}
                  >
                    {tab.faviconUrl ? (
                      <img
                        className="tab-favicon"
                        src={tab.faviconUrl}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="tab-favicon-placeholder" />
                    )}
                    <span className="tab-title">{tab.title}</span>
                    <button
                      className="tab-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.hogiumSidebar.closeTab(tab.id);
                      }}
                    >
                      {CLOSE_SVG}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <HistoryPanel />
        )}
        <div className="panel-toggle">
          <button
            className={panel === 'tabs' ? 'active' : ''}
            onClick={() => setPanel('tabs')}
          >
            Tabs
          </button>
          <button
            className={panel === 'history' ? 'active' : ''}
            onClick={() => setPanel('history')}
          >
            History
          </button>
        </div>
      </div>
    </div>
  );
}
