import { useCallback, useEffect, useRef, useState } from 'react';
import { useChromeStore } from './store';

const PLUS_SVG = (
  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 3a.75.75 0 0 1 .75.75v7.5h7.5a.75.75 0 0 1 0 1.5h-7.5v7.5a.75.75 0 0 1-1.5 0v-7.5h-7.5a.75.75 0 0 1 0-1.5h7.5v-7.5A.75.75 0 0 1 12 3Z"/></svg>
);

const CLOSE_SVG = (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M4.75 3.69 12 10.94l7.25-7.25 1.06 1.06L13.06 12l7.25 7.25-1.06 1.06L12 13.06l-7.25 7.25-1.06-1.06L10.94 12 3.69 4.75l1.06-1.06Z"/></svg>
);

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
  const searchHistory = useChromeStore((s) => s.searchHistory);
  const getRecentHistory = useChromeStore((s) => s.getRecentHistory);
  const deleteHistoryEntry = useChromeStore((s) => s.deleteHistoryEntry);
  const openUrl = useChromeStore((s) => s.openUrl);

  const loadHistory = useCallback(async (search?: string) => {
    const results = search
      ? await searchHistory(search)
      : await getRecentHistory();
    setEntries(results);
  }, [searchHistory, getRecentHistory]);

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
    deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const grouped = groupByDate(entries);

  return (
    <div className="flex flex-col flex-1 overflow-hidden app-no-drag">
      <input
        className="m-2 py-1.5 px-2.5 bg-hover border border-border rounded-md text-primary text-xs outline-none shrink-0 placeholder:text-muted focus:border-primary"
        type="text"
        placeholder="Search history…"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {entries.length === 0 && (
          <div className="py-6 px-3 text-center text-muted text-xs">
            {query ? 'No results found' : 'No history yet'}
          </div>
        )}
        {Array.from(grouped.entries()).map(([group, items]) => (
          <div key={group}>
            <div className="py-2 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-muted">{group}</div>
            {items.map((entry) => (
              <div
                key={entry.id}
                className="group/entry flex items-center py-1.5 px-3 cursor-pointer transition-colors gap-2 hover:bg-hover"
                onClick={() => openUrl(entry.url)}
              >
                {entry.faviconUrl ? (
                  <img
                    className="w-4 h-4 shrink-0 rounded-sm"
                    src={entry.faviconUrl}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-4 h-4 shrink-0 bg-tab-active rounded-sm" />
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-px">
                  <span className="text-xs truncate">{entry.title || entry.url}</span>
                  <span className="text-[10px] text-muted truncate">{entry.url}</span>
                </div>
                <button
                  className="opacity-0 group-hover/entry:opacity-100 cursor-pointer p-0.5 rounded-[3px] shrink-0 leading-none flex items-center justify-center text-muted hover:bg-active hover:text-primary app-no-drag"
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
  const tabs = useChromeStore((s) => s.tabs);
  const activePanel = useChromeStore((s) => s.activePanel);
  const setActivePanel = useChromeStore((s) => s.setActivePanel);
  const newTab = useChromeStore((s) => s.newTab);
  const switchTab = useChromeStore((s) => s.switchTab);
  const closeTab = useChromeStore((s) => s.closeTab);

  return (
    <div className="w-[220px] shrink-0 overflow-hidden bg-surface-alt text-primary app-drag">
      <div className="flex flex-col h-full border-r border-border">
        {activePanel === 'tabs' ? (
          <>
            <button
              className="flex items-center gap-2 w-full py-2.5 px-3 border-b border-border text-secondary text-[13px] cursor-pointer text-left shrink-0 transition-colors app-no-drag hover:bg-hover hover:text-primary"
              onClick={newTab}
            >
              {PLUS_SVG}
              <span>New Tab</span>
            </button>
            <div className="flex-1 overflow-y-auto overflow-x-hidden app-no-drag custom-scrollbar">
              <ul className="list-none">
                {tabs.map((tab) => (
                  <li
                    key={tab.id}
                    className={`group/tab flex items-center py-2 px-3 cursor-pointer border-l-[3px] border-l-transparent transition-colors relative hover:bg-hover ${tab.active ? 'bg-tab-active border-l-primary' : ''}`}
                    onClick={() => switchTab(tab.id)}
                    onMouseDown={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        closeTab(tab.id);
                      }
                    }}
                  >
                    {tab.faviconUrl ? (
                      <img
                        className="w-4 h-4 mr-2 shrink-0 rounded-sm"
                        src={tab.faviconUrl}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-4 h-4 mr-2 shrink-0 bg-tab-active rounded-sm" />
                    )}
                    <span className="flex-1 text-xs truncate">{tab.title}</span>
                    <button
                      className="opacity-0 group-hover/tab:opacity-100 cursor-pointer p-0.5 rounded-[3px] shrink-0 leading-none flex items-center justify-center text-muted hover:bg-active hover:text-primary app-no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
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
        <div className="flex border-t border-border shrink-0 app-no-drag">
          <button
            className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] cursor-pointer transition-colors hover:bg-hover hover:text-primary ${activePanel === 'tabs' ? 'text-primary bg-tab-active' : 'text-muted'}`}
            onClick={() => setActivePanel('tabs')}
          >
            Tabs
          </button>
          <button
            className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] cursor-pointer transition-colors hover:bg-hover hover:text-primary ${activePanel === 'history' ? 'text-primary bg-tab-active' : 'text-muted'}`}
            onClick={() => setActivePanel('history')}
          >
            History
          </button>
        </div>
      </div>
    </div>
  );
}
