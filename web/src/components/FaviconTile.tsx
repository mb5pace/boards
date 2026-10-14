import { useEffect, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import {
  faviconStatus,
  faviconUrl,
  isGenericFavicon,
  markFaviconFailed,
  markFaviconLoaded,
  tileColor,
} from '../lib/favicon';
import { hostOf } from '../lib/url';

interface FaviconTileProps {
  title: string;
  url: string;
  size?: number;
}

interface TileStyle extends CSSProperties {
  '--favicon-size': string;
  '--favicon-color': string;
}

export function FaviconTile({ title, url, size = 20 }: FaviconTileProps) {
  const host = hostOf(url);
  const [status, setStatus] = useState(() => navigator.onLine ? faviconStatus(host) : 'failed');
  const letter = (title.trim() || host).charAt(0).toUpperCase();
  const style: TileStyle = {
    '--favicon-size': `${size}px`,
    '--favicon-color': tileColor(host),
  };

  useEffect(() => {
    const syncNetworkStatus = () => setStatus(navigator.onLine ? faviconStatus(host) : 'failed');
    syncNetworkStatus();
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);
    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
    };
  }, [host]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    // Google serves its 16px generic globe with a 404 when a site has no icon.
    // The requested 32px icons are 32×32, so keep the deterministic letter tile for that response.
    if (isGenericFavicon(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)) {
      markFaviconFailed(host);
      setStatus('failed');
      return;
    }
    markFaviconLoaded(host);
    setStatus('loaded');
  };

  const handleError = () => {
    markFaviconFailed(host);
    setStatus('failed');
  };

  return (
    <span className="favicon-tile" style={style} aria-hidden="true">
      <span className="favicon-tile__letter">{letter}</span>
      {status !== 'failed' ? (
        <img
          className={status === 'loaded' ? 'favicon-tile__image favicon-tile__image--loaded' : 'favicon-tile__image'}
          src={faviconUrl(host)}
          width={size}
          height={size}
          alt=""
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </span>
  );
}
