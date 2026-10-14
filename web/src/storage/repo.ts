import { demoState } from '../lib/seed';
import { hostOf, isValidUrl, normalize } from '../lib/url';
import { uid } from '../lib/id';
import type { AppState, Board, ID, Link, Page, Settings } from '../types';
import { cloneState, createDefaultState, prepareImportedState, repairState } from './schema';

export const STORAGE_KEY = 'boards:v1';
export const STORAGE_ERROR_MESSAGE = 'Storage full — export your data.';

export interface Repo {
  load(): AppState;
  save(state: AppState): void;

  addPage(name: string): Page;
  renamePage(id: ID, name: string): void;
  deletePage(id: ID): void;

  addBoard(pageId: ID, name: string, emoji?: string): Board;
  renameBoard(id: ID, name: string): void;
  moveBoard(id: ID, pageId: ID, position: number): void;
  deleteBoard(id: ID): void;

  addLink(input: { boardId: ID; url: string; title?: string; note?: string }): Link;
  updateLink(id: ID, patch: Partial<Pick<Link, 'title' | 'url' | 'note' | 'pinned'>>): void;
  moveLink(id: ID, boardId: ID, position: number): void;
  deleteLink(id: ID): void;

  updateSettings(patch: Partial<Settings>): void;

  exportJson(): string;
  importJson(text: string): { imported: number; skipped: number; error?: string };
  loadDemo(): void;
  reset(): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RepoRuntime extends Repo {
  flush(): void;
  dispose(): void;
  readonly mode: 'local' | 'memory';
}

interface CreateRepoOptions {
  storage?: StorageLike | null;
  memory?: boolean;
  initialState?: AppState;
  debounceMs?: number;
  attachLifecycle?: boolean;
  onStorageError?: (message: string) => void;
  requestPersistence?: boolean;
}

const storageErrorListeners = new Set<(message: string | null) => void>();
let latestStorageError: string | null = null;

function publishStorageError(message: string) {
  latestStorageError = message;
  storageErrorListeners.forEach((listener) => listener(message));
}

export function subscribeStorageError(listener: (message: string | null) => void): () => void {
  storageErrorListeners.add(listener);
  listener(latestStorageError);
  return () => storageErrorListeners.delete(listener);
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    publishStorageError(STORAGE_ERROR_MESSAGE);
    return null;
  }
}

function nextPosition(items: Array<{ position: number }>): number {
  return items.length ? Math.max(...items.map((item) => item.position)) + 10 : 10;
}

function safePosition(value: number): number {
  return Number.isFinite(value) ? Math.min(1_000_000, Math.max(0, Math.round(value))) : 10;
}

export function createRepo(options: CreateRepoOptions = {}): RepoRuntime {
  const memory = options.memory ?? false;
  const storage = memory ? null : (options.storage ?? null);
  const debounceMs = options.debounceMs ?? 300;
  const onStorageError = options.onStorageError ?? publishStorageError;
  let state = options.initialState ? cloneState(options.initialState) : createDefaultState();
  let loaded = Boolean(options.initialState);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let persistenceRequested = false;

  const requestPersistence = () => {
    if (persistenceRequested || memory || !options.requestPersistence || typeof navigator === 'undefined') return;
    persistenceRequested = true;
    void navigator.storage?.persist?.().catch(() => undefined);
  };

  const ensureLoaded = () => {
    if (loaded) return;
    loaded = true;
    requestPersistence();

    if (!storage) {
      state = createDefaultState();
      return;
    }

    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (!stored) {
        state = createDefaultState();
        return;
      }
      const repaired = repairState(JSON.parse(stored));
      state = repaired.state;
      if (repaired.repairs || repaired.skipped) {
        console.warn(`[Boards] Repaired ${repaired.repairs} item(s) and skipped ${repaired.skipped} invalid link(s) while loading.`);
        scheduleWrite();
      }
    } catch (error) {
      console.warn('[Boards] Could not read saved data; starting with a safe default state.', error);
      state = createDefaultState();
      scheduleWrite();
    }
  };

  const flush = () => {
    ensureLoaded();
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (memory || !storage) return;

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      const isQuotaError = error instanceof DOMException
        ? error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        : error instanceof Error && /quota/i.test(error.name + error.message);
      onStorageError(isQuotaError ? STORAGE_ERROR_MESSAGE : 'Could not save changes — export your data.');
    }
  };

  const scheduleWrite = () => {
    if (memory || !storage) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  const commit = (next: AppState) => {
    state = next;
    scheduleWrite();
  };

  const load = (): AppState => {
    ensureLoaded();
    return cloneState(state);
  };

  const save = (nextState: AppState) => {
    ensureLoaded();
    const repaired = repairState(nextState);
    commit(repaired.state);
  };

  const api: RepoRuntime = {
    mode: memory ? 'memory' : 'local',
    load,
    save,

    addPage(name) {
      ensureLoaded();
      const page: Page = {
        id: uid('page'),
        name: name.trim() || `Page ${state.pages.length + 1}`,
        position: nextPosition(state.pages),
      };
      commit({ ...state, pages: [...state.pages, page] });
      return { ...page };
    },

    renamePage(id, name) {
      ensureLoaded();
      const cleanName = name.trim();
      if (!cleanName) return;
      commit({ ...state, pages: state.pages.map((page) => page.id === id ? { ...page, name: cleanName } : page) });
    },

    deletePage(id) {
      ensureLoaded();
      const boardIds = new Set(state.boards.filter((board) => board.pageId === id).map((board) => board.id));
      const pages = state.pages.filter((page) => page.id !== id);
      const next = {
        ...state,
        pages,
        boards: state.boards.filter((board) => board.pageId !== id),
        links: state.links.filter((link) => !boardIds.has(link.boardId)),
      };
      commit(repairState(next).state);
    },

    addBoard(pageId, name, emoji) {
      ensureLoaded();
      const resolvedPageId = state.pages.some((page) => page.id === pageId) ? pageId : state.pages[0].id;
      const siblings = state.boards.filter((board) => board.pageId === resolvedPageId);
      const board: Board = {
        id: uid('board'),
        pageId: resolvedPageId,
        name: name.trim() || `Board ${siblings.length + 1}`,
        ...(emoji?.trim() ? { emoji: emoji.trim() } : {}),
        position: nextPosition(siblings),
      };
      commit({ ...state, boards: [...state.boards, board] });
      return { ...board };
    },

    renameBoard(id, name) {
      ensureLoaded();
      const cleanName = name.trim();
      if (!cleanName) return;
      commit({ ...state, boards: state.boards.map((board) => board.id === id ? { ...board, name: cleanName } : board) });
    },

    moveBoard(id, pageId, position) {
      ensureLoaded();
      if (!state.pages.some((page) => page.id === pageId)) return;
      commit({
        ...state,
        boards: state.boards.map((board) => board.id === id
          ? { ...board, pageId, position: safePosition(position) }
          : board),
      });
    },

    deleteBoard(id) {
      ensureLoaded();
      commit({
        ...state,
        boards: state.boards.filter((board) => board.id !== id),
        links: state.links.filter((link) => link.boardId !== id),
      });
    },

    addLink(input) {
      ensureLoaded();
      if (!state.boards.some((board) => board.id === input.boardId)) {
        throw new Error('Choose a valid board.');
      }
      const url = normalize(input.url);
      if (!isValidUrl(url)) throw new Error('Enter a valid http or https URL.');

      const shiftedLinks = state.links.map((link) => link.boardId === input.boardId
        ? { ...link, position: link.position + 10 }
        : link);
      const link: Link = {
        id: uid('link'),
        boardId: input.boardId,
        title: input.title?.trim() || hostOf(url),
        url,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        position: 10,
        createdAt: Date.now(),
      };
      commit({ ...state, links: [link, ...shiftedLinks] });
      return { ...link };
    },

    updateLink(id, patch) {
      ensureLoaded();
      const normalizedPatch: Partial<Pick<Link, 'title' | 'url' | 'note' | 'pinned'>> = {};
      if (patch.url !== undefined) {
        const url = normalize(patch.url);
        if (!isValidUrl(url)) throw new Error('Enter a valid http or https URL.');
        normalizedPatch.url = url;
      }
      if (patch.title !== undefined) normalizedPatch.title = patch.title.trim();
      if (patch.note !== undefined) normalizedPatch.note = patch.note.trim();
      if (patch.pinned !== undefined) normalizedPatch.pinned = patch.pinned;
      commit({
        ...state,
        links: state.links.map((link) => {
          if (link.id !== id) return link;
          const next = { ...link, ...normalizedPatch };
          if (patch.note !== undefined && !patch.note.trim()) delete next.note;
          return next;
        }),
      });
    },

    moveLink(id, boardId, position) {
      ensureLoaded();
      if (!state.boards.some((board) => board.id === boardId)) return;
      commit({
        ...state,
        links: state.links.map((link) => link.id === id
          ? { ...link, boardId, position: safePosition(position) }
          : link),
      });
    },

    deleteLink(id) {
      ensureLoaded();
      commit({ ...state, links: state.links.filter((link) => link.id !== id) });
    },

    updateSettings(patch) {
      ensureLoaded();
      const settings: Settings = {
        wallpaper: typeof patch.wallpaper === 'string' && patch.wallpaper.trim()
          ? patch.wallpaper.trim()
          : state.settings.wallpaper,
        surface: patch.surface === 'light' || patch.surface === 'dark'
          ? patch.surface
          : state.settings.surface,
      };
      commit({ ...state, settings });
    },

    exportJson() {
      ensureLoaded();
      return JSON.stringify(state, null, 2);
    },

    importJson(jsonText) {
      ensureLoaded();
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return { imported: 0, skipped: 0, error: 'That file is not valid JSON.' };
      }
      const result = prepareImportedState(parsed);
      if (!result.state || result.error) {
        return { imported: result.imported, skipped: result.skipped, ...(result.error ? { error: result.error } : {}) };
      }
      commit(result.state);
      return { imported: result.imported, skipped: result.skipped };
    },

    loadDemo() {
      ensureLoaded();
      commit(cloneState(demoState));
    },

    reset() {
      ensureLoaded();
      commit(createDefaultState());
    },

    flush,

    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (options.attachLifecycle && typeof window !== 'undefined' && typeof document !== 'undefined') {
        window.removeEventListener('pagehide', flush);
        document.removeEventListener('visibilitychange', flushWhenHidden);
      }
    },
  };

  const flushWhenHidden = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
  };

  if (options.attachLifecycle && typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
  }

  return api;
}

export const isDemoMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('demo') === '1';

export const repo = createRepo({
  storage: isDemoMode ? null : browserStorage(),
  memory: isDemoMode,
  initialState: isDemoMode ? demoState : undefined,
  debounceMs: 300,
  attachLifecycle: true,
  requestPersistence: true,
});
