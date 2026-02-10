import { useEffect, useRef, useState } from 'react';

interface AutocompleteProps {
  query: string;
  onSelect: (url: string) => void;
  onResultsChange: (count: number, results: HistoryEntry[]) => void;
  visible: boolean;
  searchHistory: (query: string) => Promise<HistoryEntry[]>;
  getRecentHistory: () => Promise<HistoryEntry[]>;
  selectedIndex: number;
  maxResults?: number;
  className?: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function dedup(entries: HistoryEntry[]): HistoryEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

export function Autocomplete({
  query,
  onSelect,
  onResultsChange,
  visible,
  searchHistory,
  getRecentHistory,
  selectedIndex,
  maxResults = 8,
  className,
}: AutocompleteProps) {
  const [results, setResults] = useState<HistoryEntry[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!visible) {
      setResults([]);
      onResultsChange(0, []);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    let cancelled = false;

    const applyResults = (entries: HistoryEntry[]) => {
      if (cancelled) return;
      const deduped = dedup(entries).slice(0, maxResults);
      setResults(deduped);
      onResultsChange(deduped.length, deduped);
    };

    if (!query) {
      getRecentHistory().then(applyResults).catch(() => undefined);
      return () => { cancelled = true; };
    }

    debounceRef.current = setTimeout(() => {
      searchHistory(query).then(applyResults).catch(() => undefined);
    }, 150);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible, maxResults, searchHistory, getRecentHistory, onResultsChange]);

  if (!visible || results.length === 0) return null;

  return (
    <div className={className}>
      {results.map((entry, i) => (
        <div
          key={entry.id}
          className={`flex items-center py-2 px-3 gap-2 cursor-pointer transition-colors duration-100 hover:bg-hover ${i === selectedIndex ? 'bg-hover' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(entry.url);
          }}
        >
          {entry.faviconUrl ? (
            <img className="w-4 h-4 shrink-0 rounded-sm" src={entry.faviconUrl} />
          ) : (
            <div className="w-4 h-4 shrink-0 bg-hover rounded-sm" />
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-px">
            <div className="text-[13px] truncate">
              {entry.title || getDomain(entry.url)}
            </div>
            <div className="text-[11px] text-muted truncate">{getDomain(entry.url)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
