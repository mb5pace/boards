// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { faviconUrl, isGenericFavicon, tileColor } from './favicon';

describe('favicon helpers', () => {
  it('builds a 32px favicon URL from a normalized host', () => {
    expect(faviconUrl('www.example.com')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
  });

  it('recognizes Google’s 16px generic missing-icon response', () => {
    expect(isGenericFavicon(16, 16)).toBe(true);
    expect(isGenericFavicon(32, 32)).toBe(false);
  });

  it('returns a stable tile colour for each host', () => {
    expect(tileColor('example.com')).toBe(tileColor('EXAMPLE.COM'));
    expect(tileColor('www.example.com')).toBe(tileColor('example.com'));
  });
});
