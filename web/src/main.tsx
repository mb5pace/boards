import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from './AuthGate';
import { WALLPAPERS } from './lib/wallpaper';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);

async function waitForServiceWorkerControl(): Promise<void> {
  if (navigator.serviceWorker.controller) return;

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 3000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

async function warmOfflineAssets(): Promise<void> {
  await navigator.serviceWorker.ready;
  await waitForServiceWorkerControl();

  const assetUrls = [
    ...Array.from(document.scripts, (script) => script.src),
    ...Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
      (link) => link.href,
    ),
    ...WALLPAPERS.map((wallpaper) => new URL(wallpaper.src, location.origin).href),
  ].filter((url) => url && new URL(url, location.href).origin === location.origin);

  await Promise.allSettled(
    [...new Set(assetUrls)].map((url) => fetch(url, { cache: 'reload' })),
  );
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
    .then(() => warmOfflineAssets())
    .catch(() => undefined);
}
