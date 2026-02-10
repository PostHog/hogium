import { createRoot } from 'react-dom/client';
import { useChromeStore, initIpcListeners } from './store';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { NewTabOverlay } from './NewTabOverlay';

const platform = navigator.userAgent.includes('Macintosh') ? 'darwin' : undefined;

initIpcListeners();

function App() {
  const sidebarVisible = useChromeStore((s) => s.sidebarVisible);
  const overlayVisible = useChromeStore((s) => s.overlay.visible);

  return (
    <div className="chrome-shell">
      <Toolbar platform={platform} />
      <div className="chrome-body">
        {sidebarVisible && <Sidebar />}
        <div className="content-area">
          {overlayVisible && <NewTabOverlay />}
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
