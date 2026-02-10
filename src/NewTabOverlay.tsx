import { useCallback, useEffect, useRef, useState } from 'react';
import { Autocomplete } from './Autocomplete';
import { resolveInput } from './url';

const SEARCH_ICON = (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function NewTabOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [active, setActive] = useState(false);
  const resultsRef = useRef<HistoryEntry[]>([]);

  useEffect(() => {
    window.hogiumNewTab.onShow((prefillUrl) => {
      setActive(false);
      setInputValue(prefillUrl);
      setSelectedIndex(-1);
      setTimeout(() => {
        setActive(true);
        inputRef.current?.focus();
        if (prefillUrl) inputRef.current?.select();
      }, 0);
    });
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    setInputValue('');
    setSelectedIndex(-1);
    window.hogiumNewTab.cancel();
  }, []);

  const submit = useCallback((url: string) => {
    setActive(false);
    setInputValue('');
    setSelectedIndex(-1);
    window.hogiumNewTab.submit(url);
  }, []);

  const handleResultsChange = useCallback((_count: number, results: HistoryEntry[]) => {
    resultsRef.current = results;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resultsRef.current.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < resultsRef.current.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : resultsRef.current.length - 1,
        );
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        submit(resultsRef.current[selectedIndex].url);
        return;
      }
    }

    if (e.key === 'Enter') {
      const input = inputRef.current?.value.trim();
      if (!input) return;
      submit(resolveInput(input));
    }

    if (e.key === 'Escape') {
      dismiss();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      dismiss();
    }
  };

  return (
    <div data-view="new-tab-overlay">
      <div className="overlay-backdrop" onClick={handleBackdropClick}>
        <div className="overlay-card">
          <div className="search-input-wrap">
            {SEARCH_ICON}
            <input
              type="text"
              className="search-input"
              placeholder="Search or enter URL…"
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <Autocomplete
            query={inputValue}
            onSelect={submit}
            onResultsChange={handleResultsChange}
            visible={active}
            searchHistory={window.hogiumNewTab.searchHistory}
            getRecentHistory={window.hogiumNewTab.getRecentHistory}
            selectedIndex={selectedIndex}
            className="overlay-autocomplete"
          />
        </div>
      </div>
    </div>
  );
}
