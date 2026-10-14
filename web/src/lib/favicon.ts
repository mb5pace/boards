const TILE_COLORS = [
  '#3f6f8f',
  '#556b9b',
  '#6f5b8f',
  '#3d7a72',
  '#8a6547',
  '#795a72',
  '#50734f',
  '#6d6a45',
] as const;

type FaviconStatus = 'loading' | 'loaded' | 'failed';

const statusByHost = new Map<string, FaviconStatus>();

function normalizedHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '');
}

export function faviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalizedHost(host))}&sz=32`;
}

export function isGenericFavicon(width: number, height: number): boolean {
  return width < 32 || height < 32;
}

export function tileColor(host: string): string {
  const value = normalizedHost(host);
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

export function faviconStatus(host: string): FaviconStatus {
  return statusByHost.get(normalizedHost(host)) ?? 'loading';
}

export function markFaviconLoaded(host: string): void {
  statusByHost.set(normalizedHost(host), 'loaded');
}

export function markFaviconFailed(host: string): void {
  statusByHost.set(normalizedHost(host), 'failed');
}
