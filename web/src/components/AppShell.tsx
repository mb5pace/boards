import type { CSSProperties, ReactNode } from 'react';
import { wallpaperById } from '../lib/wallpaper';
import type { Settings } from '../types';

interface AppShellProps {
  children?: ReactNode;
  settings: Settings;
}

interface ShellStyle extends CSSProperties {
  '--wallpaper-image': string;
  '--wallpaper-position': string;
}

export function AppShell({ children, settings }: AppShellProps) {
  const wallpaper = wallpaperById(settings.wallpaper);
  const style: ShellStyle = {
    '--wallpaper-image': `url("${wallpaper.src}")`,
    '--wallpaper-position': wallpaper.position,
  };

  return (
    <div
      className={`app-shell app-shell--${settings.surface}`}
      data-wallpaper={wallpaper.id}
      style={style}
    >
      <div className="app-shell__wallpaper" aria-hidden="true" />
      <div className="app-shell__tint" aria-hidden="true" />
      <main className="app-shell__scroll" aria-label="Boards workspace">
        <div className="app-shell__content">{children}</div>
      </main>
    </div>
  );
}
