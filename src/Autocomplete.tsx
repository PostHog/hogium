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
    <div className={`autocomplete ${className ?? ''}`}>
      {results.map((entry, i) => (
        <div
          key={entry.id}
          className={`autocomplete-item${i === selectedIndex ? ' selected' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(entry.url);
          }}
        >
          {entry.faviconUrl ? (
            <img className="autocomplete-favicon" src={entry.faviconUrl} />
          ) : (
            <div className="autocomplete-favicon-placeholder" />
          )}
          <div className="autocomplete-text">
            <div className="autocomplete-title">
              {entry.title || getDomain(entry.url)}
            </div>
            <div className="autocomplete-url">{getDomain(entry.url)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
