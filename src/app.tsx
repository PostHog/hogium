import { createRoot } from 'react-dom/client';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { NewTabOverlay } from './NewTabOverlay';

const params = new URLSearchParams(window.location.search);
const view = params.get('view');

function App() {
  switch (view) {
    case 'toolbar':
      return <Toolbar platform={params.get('platform') ?? undefined} />;
    case 'sidebar':
      return <Sidebar />;
    case 'new-tab-overlay':
      return <NewTabOverlay />;
    default:
      return null;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
