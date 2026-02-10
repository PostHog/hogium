import { useRef, useState, useEffect } from 'react';
import { useChromeStore } from './store';

const LOGO_SVG = (
  <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.8914 17.2057c-.3685.7371-1.42031.7371-1.78884 0L8.2212 15.443c-.14077-.2815-.14077-.6129 0-.8944l.88136-1.7627c.36853-.7371 1.42034-.7371 1.78884 0l.8814 1.7627c.1407.2815.1407.6129 0 .8944l-.8814 1.7627zM10.8914 27.2028c-.3685.737-1.42031.737-1.78884 0L8.2212 25.44c-.14077-.2815-.14077-.6129 0-.8944l.88136-1.7627c.36853-.7371 1.42034-.7371 1.78884 0l.8814 1.7627c.1407.2815.1407.6129 0 .8944l-.8814 1.7628z" fill="#1D4AFF"/>
    <path d="M0 23.4082c0-.8909 1.07714-1.3371 1.70711-.7071l4.58338 4.5834c.62997.63.1838 1.7071-.7071 1.7071H.999999c-.552284 0-.999999-.4477-.999999-1v-4.5834zm0-4.8278c0 .2652.105357.5196.292893.7071l9.411217 9.4112c.18753.1875.44189.2929.70709.2929h5.1692c.8909 0 1.3371-1.0771.7071-1.7071L1.70711 12.7041C1.07714 12.0741 0 12.5203 0 13.4112v5.1692zm0-9.99701c0 .26521.105357.51957.292893.7071L19.7011 28.6987c.1875.1875.4419.2929.7071.2929h5.1692c.8909 0 1.3371-1.0771.7071-1.7071L1.70711 2.70711C1.07715 2.07715 0 2.52331 0 3.41421v5.16918zm9.997 0c0 .26521.1054.51957.2929.7071l17.994 17.99401c.63.63 1.7071.1838 1.7071-.7071v-5.1692c0-.2652-.1054-.5196-.2929-.7071l-17.994-17.994c-.63-.62996-1.7071-.18379-1.7071.70711v5.16918zm11.7041-5.87628c-.63-.62997-1.7071-.1838-1.7071.7071v5.16918c0 .26521.1054.51957.2929.7071l7.997 7.99701c.63.63 1.7071.1838 1.7071-.7071v-5.1692c0-.2652-.1054-.5196-.2929-.7071l-7.997-7.99699z" fill="#F9BD2B"/>
    <path className="logo-body" d="M42.5248 23.5308l-9.4127-9.4127c-.63-.63-1.7071-.1838-1.7071.7071v13.1664c0 .5523.4477 1 1 1h14.5806c.5523 0 1-.4477 1-1v-1.199c0-.5523-.4496-.9934-.9973-1.0647-1.6807-.2188-3.2528-.9864-4.4635-2.1971zm-6.3213 2.2618c-.8829 0-1.5995-.7166-1.5995-1.5996 0-.8829.7166-1.5995 1.5995-1.5995.883 0 1.5996.7166 1.5996 1.5995 0 .883-.7166 1.5996-1.5996 1.5996z"/>
    <path d="M0 27.9916c0 .5523.447715 1 1 1h4.58339c.8909 0 1.33707-1.0771.70711-1.7071l-4.58339-4.5834C1.07714 22.0711 0 22.5173 0 23.4082v4.5834zM9.997 10.997L1.70711 2.70711C1.07714 2.07714 0 2.52331 0 3.41421v5.16918c0 .26521.105357.51957.292893.7071L9.997 18.9946V10.997zM1.70711 12.7041C1.07714 12.0741 0 12.5203 0 13.4112v5.1692c0 .2652.105357.5196.292893.7071L9.997 28.9916V20.994l-8.28989-8.2899z" fill="#1D4AFF"/>
    <path d="M19.994 11.4112c0-.2652-.1053-.5196-.2929-.7071l-7.997-7.99699c-.6299-.62997-1.70709-.1838-1.70709.7071v5.16918c0 .26521.10539.51957.29289.7071l9.7041 9.70411v-7.5834zM9.99701 28.9916h5.58339c.8909 0 1.3371-1.0771.7071-1.7071L9.99701 20.994v7.9976zM9.99701 10.997v7.5834c0 .2652.10539.5196.29289.7071l9.7041 9.7041v-7.5834c0-.2652-.1053-.5196-.2929-.7071L9.99701 10.997z" fill="#F54E00"/>
  </svg>
);

export function Toolbar({ platform }: { platform?: string }) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const url = useChromeStore((s) => s.currentUrl);
  const loading = useChromeStore((s) => s.loading);
  const showOverlay = useChromeStore((s) => s.showOverlay);
  const back = useChromeStore((s) => s.back);
  const forward = useChromeStore((s) => s.forward);
  const refresh = useChromeStore((s) => s.refresh);
  const newTab = useChromeStore((s) => s.newTab);
  const [progressClass, setProgressClass] = useState('progress-bar');

  useEffect(() => {
    if (loading) {
      setProgressClass('progress-bar loading');
    } else {
      setProgressClass('progress-bar done');
      const timer = setTimeout(() => {
        setProgressClass((prev) => prev === 'progress-bar done' ? 'progress-bar' : prev);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleAddressBarClick = () => {
    if (url) {
      showOverlay('navigate', url);
    } else {
      showOverlay('new-tab');
    }
  };

  return (
    <div data-view="toolbar" className={platform === 'darwin' ? 'macos' : undefined}>
      <div className="toolbar">
        <div className="logo">
          {LOGO_SVG}
          <span className="logo-text">hogium</span>
        </div>

        <div className="nav-buttons">
          <button onClick={back} title="Back">
            <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="m5.229 11.332 4.97-4.97a.75.75 0 1 0-1.061-1.06l-5.543 5.543a1.75 1.75 0 0 0 0 2.474l5.543 5.543a.75.75 0 1 0 1.06-1.06l-4.97-4.97h14.94a.75.75 0 0 0 0-1.5H5.228Z"/></svg>
          </button>
          <button onClick={forward} title="Forward">
            <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="m18.771 12.832-4.97 4.97a.75.75 0 1 0 1.062 1.06l5.542-5.542a1.75 1.75 0 0 0 0-2.475l-5.543-5.543a.75.75 0 0 0-1.06 1.06l4.97 4.97H3.832a.75.75 0 0 0 0 1.5h14.94Z"/></svg>
          </button>
          <button onClick={refresh} title="Refresh">
            <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M4.75 3C5.16421 3 5.5 3.33579 5.5 3.75V5.71122C7.1554 4.03743 9.4791 3 12 3C16.9706 3 21 7.02944 21 12C21 12.3803 20.9764 12.7555 20.9304 13.1241C20.8792 13.5351 20.5044 13.8267 20.0934 13.7755C19.6823 13.7242 19.3907 13.3495 19.4419 12.9384C19.4802 12.6313 19.5 12.3181 19.5 12C19.5 7.85786 16.1421 4.5 12 4.5C9.77612 4.5 7.73561 5.46681 6.3448 7H8.75C9.16421 7 9.5 7.33579 9.5 7.75C9.5 8.16421 9.16421 8.5 8.75 8.5H5.25C4.55964 8.5 4 7.94036 4 7.25V3.75C4 3.33579 4.33579 3 4.75 3ZM3.90663 10.2245C4.31766 10.2758 4.60932 10.6505 4.55806 11.0616C4.51977 11.3687 4.5 11.6819 4.5 12C4.5 16.1421 7.85786 19.5 12 19.5C14.2239 19.5 16.2644 18.5332 17.6552 17H15.2618C14.8476 17 14.5118 16.6642 14.5118 16.25C14.5118 15.8358 14.8476 15.5 15.2618 15.5H18.7618C19.4522 15.5 20.0118 16.0596 20.0118 16.75V20.25C20.0118 20.6642 19.6761 21 19.2618 21C18.8476 21 18.5118 20.6642 18.5118 20.25V18.2768C16.8557 19.9576 14.5269 21 12 21C7.02944 21 3 16.9706 3 12C3 11.6197 3.02364 11.2445 3.06959 10.8759C3.12085 10.4649 3.4956 10.1733 3.90663 10.2245Z"/></svg>
          </button>
          <button onClick={newTab} title="New Tab">
            <svg viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 3a.75.75 0 0 1 .75.75v7.5h7.5a.75.75 0 0 1 0 1.5h-7.5v7.5a.75.75 0 0 1-1.5 0v-7.5h-7.5a.75.75 0 0 1 0-1.5h7.5v-7.5A.75.75 0 0 1 12 3Z"/></svg>
          </button>
        </div>

        <div
          className="address-bar"
          onClick={handleAddressBarClick}
        >
          {url ? (
            <span className="address-bar-url">{url}</span>
          ) : (
            <span className="address-bar-placeholder">Search or enter URL…</span>
          )}
        </div>

        <div className={progressClass} ref={progressBarRef} />
      </div>
    </div>
  );
}
