import type { Link } from '../types';

export function filterLinks(links: Link[], query: string): Link[] {
  const q = query.trim().toLowerCase();
  if (!q) return links;
  return links.filter((link) =>
    link.title.toLowerCase().includes(q)
    || link.url.toLowerCase().includes(q)
    || (link.note ?? '').toLowerCase().includes(q)
  );
}
