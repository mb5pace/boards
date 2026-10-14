import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { WALLPAPERS, wallpaperById } from '../lib/wallpaper';
import type { Settings } from '../types';

export type SettingsTab = 'general' | 'appearance' | 'data';

interface SettingsPanelProps {
  settings: Settings;
  initialTab?: SettingsTab;
  counts: { pages: number; boards: number; links: number };
  demoMode: boolean;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onDemo: () => void;
  onReset: () => void;
}

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Data' },
];

export function SettingsPanel({
  settings,
  initialTab = 'general',
  counts,
  demoMode,
  onClose,
  onUpdateSettings,
  onExport,
  onImport,
  onDemo,
  onReset,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [surface, setSurface] = useState(settings.surface);
  const [wallpaper, setWallpaper] = useState(wallpaperById(settings.wallpaper).id);
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [compactRows, setCompactRows] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const chooseSurface = (nextSurface: Settings['surface']) => {
    setSurface(nextSurface);
    onUpdateSettings({ surface: nextSurface });
  };

  const chooseWallpaper = (nextWallpaper: string) => {
    setWallpaper(nextWallpaper);
    onUpdateSettings({ wallpaper: nextWallpaper });
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void file.text().then(onImport);
  };

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={handleBackdropClick}>
      <aside className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-panel__header">
          <div>
            <span className="dialog__eyebrow">BOARDS</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </header>

        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'settings-tab settings-tab--active' : 'settings-tab'}
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-panel__content">
          {activeTab === 'general' ? (
            <section className="settings-section" aria-labelledby="settings-general-title">
              <div className="settings-section__heading">
                <h3 id="settings-general-title">Your new tab</h3>
                <p>A calm, local workspace for the links you use every day.</p>
              </div>
              {demoMode ? (
                <div className="demo-note">
                  <strong>Demo mode is active</strong>
                  <span>Changes stay in memory and reset when this tab reloads.</span>
                </div>
              ) : null}
              <div className="setting-row">
                <div>
                  <strong>Open links in a new tab</strong>
                  <span>Keep Boards open when you follow a bookmark.</span>
                </div>
                <button
                  className={openInNewTab ? 'switch switch--on' : 'switch'}
                  type="button"
                  aria-label="Open links in a new tab"
                  aria-pressed={openInNewTab}
                  onClick={() => setOpenInNewTab((enabled) => !enabled)}
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Compact link rows</strong>
                  <span>Show more bookmarks without scrolling.</span>
                </div>
                <button
                  className={compactRows ? 'switch switch--on' : 'switch'}
                  type="button"
                  aria-label="Compact link rows"
                  aria-pressed={compactRows}
                  onClick={() => setCompactRows((enabled) => !enabled)}
                >
                  <span />
                </button>
              </div>
              <div className="privacy-note">
                <span aria-hidden="true">⌂</span>
                <p><strong>Private by default.</strong> Your boards stay in this browser and are never sent to a server.</p>
              </div>
            </section>
          ) : null}

          {activeTab === 'appearance' ? (
            <section className="settings-section" aria-labelledby="settings-appearance-title">
              <div className="settings-section__heading">
                <h3 id="settings-appearance-title">Appearance</h3>
                <p>These choices are saved with the rest of your workspace.</p>
              </div>
              <fieldset className="setting-group">
                <legend>Surface</legend>
                <div className="segmented-control">
                  <button
                    className={surface === 'dark' ? 'segmented-control__active' : ''}
                    type="button"
                    onClick={() => chooseSurface('dark')}
                  >
                    Dark
                  </button>
                  <button
                    className={surface === 'light' ? 'segmented-control__active' : ''}
                    type="button"
                    onClick={() => chooseSurface('light')}
                  >
                    Light
                  </button>
                </div>
              </fieldset>
              <fieldset className="setting-group">
                <legend>Wallpaper</legend>
                <div className="wallpaper-grid">
                  {WALLPAPERS.map((option) => (
                    <button
                      className={`wallpaper-swatch${wallpaper === option.id ? ' wallpaper-swatch--active' : ''}`}
                      type="button"
                      onClick={() => chooseWallpaper(option.id)}
                      aria-pressed={wallpaper === option.id}
                      title={option.description}
                      key={option.id}
                    >
                      <img src={option.src} alt="" width="160" height="90" decoding="async" />
                      <span>{option.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
          ) : null}

          {activeTab === 'data' ? (
            <section className="settings-section" aria-labelledby="settings-data-title">
              <div className="settings-section__heading">
                <h3 id="settings-data-title">Your data</h3>
                <p>{counts.pages} pages · {counts.boards} boards · {counts.links} links</p>
              </div>
              <div className="data-actions">
                <button type="button" onClick={onExport}>
                  <span className="data-action__icon" aria-hidden="true">↓</span>
                  <span><strong>Export JSON</strong><small>Download a complete backup</small></span>
                </button>
                <button type="button" onClick={() => importInputRef.current?.click()}>
                  <span className="data-action__icon" aria-hidden="true">↑</span>
                  <span><strong>Import JSON</strong><small>Validate and replace from a backup</small></span>
                </button>
                <input
                  className="sr-only"
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  tabIndex={-1}
                />
                <button type="button" onClick={onDemo}>
                  <span className="data-action__icon" aria-hidden="true">✦</span>
                  <span><strong>Load demo data</strong><small>Replace the workspace with examples</small></span>
                </button>
              </div>
              <div className="danger-zone">
                <div>
                  <strong>Reset everything</strong>
                  <span>Remove every page, board, and link.</span>
                </div>
                <button className="button button--danger-outline" type="button" onClick={onReset}>Reset</button>
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
