import type { ReactNode } from 'react';

export type ActiveControl = 'add' | 'appearance' | 'search' | 'settings' | null;

interface FloatingControlsProps {
  active: ActiveControl;
  onAddLink: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onWallpaper: () => void;
}

interface ControlButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ControlButton({ label, active = false, onClick, children }: ControlButtonProps) {
  return (
    <button
      className={`floating-control${active ? ' floating-control--active' : ''}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function FloatingControls({
  active,
  onAddLink,
  onSearch,
  onSettings,
  onWallpaper,
}: FloatingControlsProps) {
  return (
    <>
      <aside className="floating-cluster floating-cluster--left" aria-label="Create and appearance controls">
        <ControlButton label="Add link" active={active === 'add'} onClick={onAddLink}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </ControlButton>
        <ControlButton label="Wallpaper and appearance" active={active === 'appearance'} onClick={onWallpaper}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="m5 17 4-4 3 3 2-2 5 4" />
          </svg>
        </ControlButton>
      </aside>

      <aside className="floating-cluster floating-cluster--right" aria-label="Search and settings controls">
        <ControlButton label="Search bookmarks" active={active === 'search'} onClick={onSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="5.5" />
            <path d="m15 15 4 4" />
          </svg>
        </ControlButton>
        <ControlButton label="Open settings" active={active === 'settings'} onClick={onSettings}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.6-1.4l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.4-.6L11 3H8l-.7 2a7 7 0 0 0-1.4.6L4 4.7 1.9 6.8l.9 1.9a7 7 0 0 0-.6 1.4L.2 11v3l2 .7a7 7 0 0 0 .6 1.4L1.9 18l2.1 2.1 1.9-.9a7 7 0 0 0 1.4.6l.7 2h3l.7-2a7 7 0 0 0 1.4-.6l1.9.9L18 18l-.9-1.9a7 7 0 0 0 .6-1.4Z" transform="translate(2 -0.4) scale(.83)" />
          </svg>
        </ControlButton>
      </aside>
    </>
  );
}
