import { useCallback, useEffect, useRef, useState } from 'react';
import { useChromeStore } from './store';
import { Autocomplete } from './Autocomplete';
import { resolveInput } from './url';

const SEARCH_ICON = (
  <svg className="w-4 h-4 text-muted shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function NewTabOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsRef = useRef<HistoryEntry[]>([]);
  const overlay = useChromeStore((s) => s.overlay);
  const submitOverlay = useChromeStore((s) => s.submitOverlay);
  const cancelOverlay = useChromeStore((s) => s.cancelOverlay);
  const searchHistory = useChromeStore((s) => s.searchHistory);
  const getRecentHistory = useChromeStore((s) => s.getRecentHistory);

  useEffect(() => {
    setInputValue(overlay.prefillUrl);
    setSelectedIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
      if (overlay.prefillUrl) inputRef.current?.select();
    }, 0);
  }, [overlay.visible, overlay.prefillUrl]);

  const dismiss = useCallback(() => {
    setInputValue('');
    setSelectedIndex(-1);
    cancelOverlay();
  }, [cancelOverlay]);

  const submit = useCallback((url: string) => {
    setInputValue('');
    setSelectedIndex(-1);
    submitOverlay(url);
  }, [submitOverlay]);

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
    <div className="absolute inset-0 text-primary pointer-events-auto">
      <div className="bg-backdrop flex items-start justify-center h-full pt-[20vh]" onClick={handleBackdropClick}>
        <div className="w-[560px] max-w-[90vw] bg-surface-overlay border border-border rounded-xl shadow-[0_12px_40px_var(--c-shadow),0_4px_12px_var(--c-shadow)] overflow-hidden">
          <div className="flex items-center px-4">
            {SEARCH_ICON}
            <input
              type="text"
              className="flex-1 bg-transparent border-none py-3.5 px-3 text-primary text-base outline-none placeholder:text-muted"
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
            visible={overlay.visible}
            searchHistory={searchHistory}
            getRecentHistory={getRecentHistory}
            selectedIndex={selectedIndex}
            className="border-t border-border max-h-80 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
}
