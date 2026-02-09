import { useEffect, useRef } from 'react';
import { resolveInput } from './url';

export function NewTabOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.hogiumNewTab.onShow(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = inputRef.current?.value.trim();
      if (!input) return;
      window.hogiumNewTab.submit(resolveInput(input));
      if (inputRef.current) inputRef.current.value = '';
    }

    if (e.key === 'Escape') {
      window.hogiumNewTab.cancel();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      window.hogiumNewTab.cancel();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div data-view="new-tab-overlay">
      <div className="overlay-backdrop" onClick={handleBackdropClick}>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search or enter URL..."
            ref={inputRef}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
