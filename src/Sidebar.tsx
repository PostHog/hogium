import { useEffect, useRef, useState } from 'react';

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

export function Sidebar() {
  const [tabs, setTabs] = useState<SidebarTab[]>([]);
  const draggingRef = useRef(false);

  useEffect(() => {
    window.hogiumSidebar.onTabsUpdated((updatedTabs) => {
      setTabs(updatedTabs);
    });
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.tab, .new-tab-btn, .tab-close')) return;
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
      if (target.closest('.tab, .new-tab-btn, .tab-close')) return;
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
      </div>
    </div>
  );
}
