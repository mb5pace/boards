// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { hostOf, isValidUrl, normalize } from './url';

describe('URL helpers', () => {
  it('normalizes a missing scheme and extracts the host', () => {
    expect(normalize('example.com/path')).toBe('https://example.com/path');
    expect(hostOf('https://www.example.com/path')).toBe('example.com');
  });

  it('accepts only whitespace-free HTTP and HTTPS URLs', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('http://localhost:5173')).toBe(true);
    expect(isValidUrl('https://not a valid url')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});
