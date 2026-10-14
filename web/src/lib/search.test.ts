// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { Link } from '../types';
import { filterLinks } from './search';

const links: Link[] = [
  {
    id: 'one',
    boardId: 'board',
    title: 'Design systems',
    url: 'https://example.com/design',
    note: 'Colour and typography reference',
    position: 10,
    createdAt: 1,
  },
  {
    id: 'two',
    boardId: 'board',
    title: 'Release dashboard',
    url: 'https://vercel.com/dashboard',
    position: 20,
    createdAt: 2,
  },
];

describe('filterLinks', () => {
  it('matches title, URL, and note case-insensitively', () => {
    expect(filterLinks(links, 'DESIGN')).toEqual([links[0]]);
    expect(filterLinks(links, 'vercel.com')).toEqual([links[1]]);
    expect(filterLinks(links, 'typography')).toEqual([links[0]]);
  });

  it('returns all links for an empty query and none for no match', () => {
    expect(filterLinks(links, '   ')).toBe(links);
    expect(filterLinks(links, 'missing')).toEqual([]);
  });
});
