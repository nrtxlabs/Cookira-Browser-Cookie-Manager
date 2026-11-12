import React from 'react';

interface SurfaceTabsBarProps {
  activeTab: 'cookies' | 'watcher';
  cookieCount: number;
  watcherCount: number;
  onSelectTab: (tab: 'cookies' | 'watcher') => void;
}

export const SurfaceTabsBar: React.FC<SurfaceTabsBarProps> = ({
  activeTab,
  cookieCount,
  watcherCount,
  onSelectTab,
}) => {
  return (
    <div
      className="px-3 py-1.5 border-b flex items-center gap-1.5"
      style={{
        backgroundColor: 'var(--ck-surface)',
        borderColor: 'var(--ck-border-subtle)',
      }}
    >
      <button
        type="button"
        onClick={() => onSelectTab('cookies')}
        className="cookira-chip cookira-mono text-xs px-2.5 py-1 rounded border cursor-pointer"
        style={{
          backgroundColor: activeTab === 'cookies' ? 'var(--ck-accent-soft)' : 'transparent',
          borderColor: activeTab === 'cookies' ? 'var(--ck-border-strong)' : 'transparent',
          color: activeTab === 'cookies' ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
        }}
      >
        Cookies ({cookieCount})
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('watcher')}
        className="cookira-chip cookira-mono text-xs px-2.5 py-1 rounded border cursor-pointer"
        style={{
          backgroundColor: activeTab === 'watcher' ? 'var(--ck-accent-soft)' : 'transparent',
          borderColor: activeTab === 'watcher' ? 'var(--ck-border-strong)' : 'transparent',
          color: activeTab === 'watcher' ? 'var(--ck-accent)' : 'var(--ck-text-muted)',
        }}
      >
        Live Watcher ({watcherCount})
      </button>
    </div>
  );
};
