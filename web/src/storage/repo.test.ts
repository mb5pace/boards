// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { demoState } from '../lib/seed';
import { createRepo, STORAGE_KEY } from './repo';
import type { StorageLike } from './repo';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('repo', () => {
  it('round-trips pages, boards, links, and settings through storage', () => {
    const storage = new MemoryStorage();
    const first = createRepo({ storage, debounceMs: 300 });
    const page = first.addPage('Projects');
    const board = first.addBoard(page.id, 'Launch');
    const link = first.addLink({ boardId: board.id, url: 'example.com', title: 'Example', note: 'Round trip' });
    first.updateLink(link.id, { pinned: true });
    first.updateSettings({ surface: 'light', wallpaper: 'aurora' });
    first.flush();

    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    const second = createRepo({ storage });
    const loaded = second.load();
    expect(loaded.version).toBe(1);
    expect(loaded.pages.some((item) => item.name === 'Projects')).toBe(true);
    expect(loaded.boards.find((item) => item.id === board.id)).toMatchObject({ pageId: page.id, name: 'Launch' });
    expect(loaded.links.find((item) => item.id === link.id)).toMatchObject({
      boardId: board.id,
      url: 'https://example.com',
      title: 'Example',
      note: 'Round trip',
      pinned: true,
    });
    expect(loaded.settings).toEqual({ surface: 'light', wallpaper: 'aurora' });

    first.dispose();
    second.dispose();
  });

  it('debounces writes and flushes the latest state after 300ms', () => {
    vi.useFakeTimers();
    try {
      const storage = new MemoryStorage();
      const testRepo = createRepo({ storage, debounceMs: 300 });
      testRepo.addPage('One');
      testRepo.addPage('Two');

      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      vi.advanceTimersByTime(299);
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      vi.advanceTimersByTime(1);

      const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as { pages?: Array<{ name: string }> };
      expect(saved.pages?.map((page) => page.name)).toEqual(expect.arrayContaining(['Home', 'One', 'Two']));
      testRepo.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips bad URLs, remaps foreign ids, and repairs orphan references on import', () => {
    const storage = new MemoryStorage();
    const testRepo = createRepo({ storage });
    const result = testRepo.importJson(JSON.stringify({
      version: 1,
      pages: [{ id: 'foreign-page', name: 'Imported', position: 10 }],
      boards: [{ id: 'foreign-board', pageId: 'missing-page', name: 'Orphan board', position: 10 }],
      links: [
        {
          id: 'foreign-link',
          boardId: 'missing-board',
          title: 'Valid link',
          url: 'https://example.org/path',
          position: 10,
          createdAt: 1,
        },
        {
          id: 'bad-link',
          boardId: 'foreign-board',
          title: 'Bad link',
          url: 'not a valid url',
          position: 20,
          createdAt: 2,
        },
      ],
      settings: { wallpaper: 'mist', surface: 'dark' },
    }));

    expect(result).toEqual({ imported: 1, skipped: 1 });
    const loaded = testRepo.load();
    expect(loaded.pages.some((page) => page.id === 'foreign-page')).toBe(false);
    expect(loaded.boards.some((board) => board.id === 'foreign-board')).toBe(false);
    expect(loaded.links.some((link) => link.id === 'foreign-link')).toBe(false);
    expect(loaded.boards.every((board) => loaded.pages.some((page) => page.id === board.pageId))).toBe(true);
    expect(loaded.links.every((link) => loaded.boards.some((board) => board.id === link.boardId))).toBe(true);
    expect(loaded.links).toHaveLength(1);
    expect(loaded.links[0].url).toBe('https://example.org/path');

    testRepo.dispose();
  });

  it('repairs orphan references when loading stored state', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      pages: [{ id: 'home', name: 'Home', position: 10 }],
      boards: [{ id: 'board', pageId: 'missing-page', name: 'Recovered board', position: 10 }],
      links: [{
        id: 'link',
        boardId: 'missing-board',
        title: 'Recovered link',
        url: 'https://example.com',
        position: 10,
        createdAt: 1,
      }],
      settings: { wallpaper: 'midnight-blue', surface: 'dark' },
    }));

    const testRepo = createRepo({ storage });
    const loaded = testRepo.load();
    expect(loaded.boards[0].pageId).toBe(loaded.pages[0].id);
    expect(loaded.links[0].boardId).toBe(loaded.boards[0].id);
    expect(warn).toHaveBeenCalledOnce();

    testRepo.dispose();
    warn.mockRestore();
  });

  it('does not write in memory-only demo mode', () => {
    const storage = new MemoryStorage();
    const testRepo = createRepo({ storage, memory: true, initialState: demoState });
    testRepo.addPage('Temporary');
    testRepo.flush();

    expect(testRepo.load().pages.some((page) => page.name === 'Temporary')).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    testRepo.dispose();
  });

  it('does not replace existing data when import JSON is invalid', () => {
    const testRepo = createRepo({ storage: new MemoryStorage() });
    const before = testRepo.exportJson();
    const result = testRepo.importJson('{broken');

    expect(result.error).toBe('That file is not valid JSON.');
    expect(testRepo.exportJson()).toBe(before);
    testRepo.dispose();
  });
});
