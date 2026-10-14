import { uid } from '../lib/id';
import { isValidUrl, normalize } from '../lib/url';
import type { AppState, Board, ID, Link, Page, Settings } from '../types';

export const APP_VERSION = 1 as const;

export const DEFAULT_SETTINGS: Settings = {
  wallpaper: 'midnight-blue',
  surface: 'dark',
};

interface RepairResult {
  state: AppState;
  repairs: number;
  skipped: number;
}

export interface ImportStateResult {
  state?: AppState;
  imported: number;
  skipped: number;
  error?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function position(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1_000_000, Math.max(0, Math.round(value)));
}

function timestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : Date.now();
}

function uniqueId(value: unknown, prefix: string, used: Set<ID>): { id: ID; repaired: boolean } {
  const candidate = typeof value === 'string' && value.trim() ? value.trim() : '';
  if (candidate && !used.has(candidate)) {
    used.add(candidate);
    return { id: candidate, repaired: false };
  }

  let id = uid(prefix);
  while (used.has(id)) id = uid(prefix);
  used.add(id);
  return { id, repaired: true };
}

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return items.sort((a, b) => a.position - b.position);
}

export function createDefaultState(): AppState {
  return {
    version: APP_VERSION,
    pages: [{ id: uid('page'), name: 'Home', position: 10 }],
    boards: [],
    links: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function cloneState(state: AppState): AppState {
  return {
    version: APP_VERSION,
    pages: state.pages.map((page) => ({ ...page })),
    boards: state.boards.map((board) => ({ ...board })),
    links: state.links.map((link) => ({ ...link })),
    settings: { ...state.settings },
  };
}

export function repairState(input: unknown): RepairResult {
  if (!isRecord(input)) {
    return { state: createDefaultState(), repairs: 1, skipped: 0 };
  }

  let repairs = input.version === APP_VERSION ? 0 : 1;
  let skipped = 0;
  const pageIds = new Set<ID>();
  const boardIds = new Set<ID>();
  const linkIds = new Set<ID>();
  const rawPages = Array.isArray(input.pages) ? input.pages : [];
  const rawBoards = Array.isArray(input.boards) ? input.boards : [];
  const rawLinks = Array.isArray(input.links) ? input.links : [];

  if (!Array.isArray(input.pages)) repairs += 1;
  if (!Array.isArray(input.boards)) repairs += 1;
  if (!Array.isArray(input.links)) repairs += 1;

  const pages: Page[] = [];
  rawPages.forEach((rawPage, index) => {
    if (!isRecord(rawPage)) {
      repairs += 1;
      return;
    }
    const resolvedId = uniqueId(rawPage.id, 'page', pageIds);
    if (resolvedId.repaired) repairs += 1;
    pages.push({
      id: resolvedId.id,
      name: text(rawPage.name, `Page ${index + 1}`),
      position: position(rawPage.position, (index + 1) * 10),
    });
  });

  if (!pages.some((page) => page.name.toLowerCase() === 'home')) {
    const homeId = uniqueId(undefined, 'page', pageIds).id;
    const firstPosition = pages.length ? Math.max(0, Math.min(...pages.map((page) => page.position)) - 10) : 10;
    pages.push({ id: homeId, name: 'Home', position: firstPosition });
    repairs += 1;
  }
  sortByPosition(pages);
  const firstPageId = pages[0].id;

  const boards: Board[] = [];
  rawBoards.forEach((rawBoard, index) => {
    if (!isRecord(rawBoard)) {
      repairs += 1;
      return;
    }
    const resolvedId = uniqueId(rawBoard.id, 'board', boardIds);
    if (resolvedId.repaired) repairs += 1;
    const requestedPageId = typeof rawBoard.pageId === 'string' ? rawBoard.pageId : '';
    const pageId = pageIds.has(requestedPageId) ? requestedPageId : firstPageId;
    if (pageId !== requestedPageId) repairs += 1;
    boards.push({
      id: resolvedId.id,
      pageId,
      name: text(rawBoard.name, `Board ${index + 1}`),
      ...(optionalText(rawBoard.emoji) ? { emoji: optionalText(rawBoard.emoji) } : {}),
      position: position(rawBoard.position, (index + 1) * 10),
    });
  });
  sortByPosition(boards);

  const hasValidRawLink = rawLinks.some((rawLink) => {
    if (!isRecord(rawLink) || typeof rawLink.url !== 'string') return false;
    return isValidUrl(normalize(rawLink.url));
  });
  if (!boards.length && hasValidRawLink) {
    const id = uniqueId(undefined, 'board', boardIds).id;
    boards.push({ id, pageId: firstPageId, name: 'Unsorted', position: 10 });
    repairs += 1;
  }
  const firstBoardId = boards[0]?.id;

  const links: Link[] = [];
  rawLinks.forEach((rawLink, index) => {
    if (!isRecord(rawLink) || typeof rawLink.url !== 'string') {
      skipped += 1;
      return;
    }
    const url = normalize(rawLink.url);
    if (!isValidUrl(url)) {
      skipped += 1;
      return;
    }
    if (!firstBoardId) {
      skipped += 1;
      return;
    }

    const resolvedId = uniqueId(rawLink.id, 'link', linkIds);
    if (resolvedId.repaired) repairs += 1;
    const requestedBoardId = typeof rawLink.boardId === 'string' ? rawLink.boardId : '';
    const boardId = boardIds.has(requestedBoardId) ? requestedBoardId : firstBoardId;
    if (boardId !== requestedBoardId) repairs += 1;
    links.push({
      id: resolvedId.id,
      boardId,
      title: text(rawLink.title, new URL(url).hostname.replace(/^www\./, '')),
      url,
      ...(optionalText(rawLink.note) ? { note: optionalText(rawLink.note) } : {}),
      ...(typeof rawLink.pinned === 'boolean' ? { pinned: rawLink.pinned } : {}),
      position: position(rawLink.position, (index + 1) * 10),
      createdAt: timestamp(rawLink.createdAt),
    });
  });
  sortByPosition(links);

  const rawSettings = isRecord(input.settings) ? input.settings : {};
  if (!isRecord(input.settings)) repairs += 1;
  const settings: Settings = {
    wallpaper: text(rawSettings.wallpaper, DEFAULT_SETTINGS.wallpaper),
    surface: rawSettings.surface === 'light' || rawSettings.surface === 'dark'
      ? rawSettings.surface
      : DEFAULT_SETTINGS.surface,
  };
  if (rawSettings.surface !== 'light' && rawSettings.surface !== 'dark') repairs += 1;

  return {
    state: { version: APP_VERSION, pages, boards, links, settings },
    repairs,
    skipped,
  };
}

export function prepareImportedState(input: unknown): ImportStateResult {
  if (!isRecord(input)) {
    return { imported: 0, skipped: 0, error: 'The selected file does not contain a Boards backup.' };
  }
  if (input.version !== undefined && input.version !== APP_VERSION) {
    return { imported: 0, skipped: 0, error: `Unsupported backup version: ${String(input.version)}.` };
  }
  if (!Array.isArray(input.pages) || !Array.isArray(input.boards) || !Array.isArray(input.links)) {
    return { imported: 0, skipped: 0, error: 'The backup is missing pages, boards, or links.' };
  }

  const pages: Page[] = [];
  const pageIdMap = new Map<string, ID>();
  input.pages.forEach((rawPage, index) => {
    if (!isRecord(rawPage)) return;
    const id = uid('page');
    if (typeof rawPage.id === 'string' && rawPage.id && !pageIdMap.has(rawPage.id)) {
      pageIdMap.set(rawPage.id, id);
    }
    pages.push({
      id,
      name: text(rawPage.name, `Page ${index + 1}`),
      position: position(rawPage.position, (index + 1) * 10),
    });
  });
  if (!pages.some((page) => page.name.toLowerCase() === 'home')) {
    pages.push({ id: uid('page'), name: 'Home', position: pages.length ? 0 : 10 });
  }
  sortByPosition(pages);
  const firstPageId = pages[0].id;

  const boards: Board[] = [];
  const boardIdMap = new Map<string, ID>();
  input.boards.forEach((rawBoard, index) => {
    if (!isRecord(rawBoard)) return;
    const id = uid('board');
    if (typeof rawBoard.id === 'string' && rawBoard.id && !boardIdMap.has(rawBoard.id)) {
      boardIdMap.set(rawBoard.id, id);
    }
    const mappedPageId = typeof rawBoard.pageId === 'string' ? pageIdMap.get(rawBoard.pageId) : undefined;
    boards.push({
      id,
      pageId: mappedPageId ?? firstPageId,
      name: text(rawBoard.name, `Board ${index + 1}`),
      ...(optionalText(rawBoard.emoji) ? { emoji: optionalText(rawBoard.emoji) } : {}),
      position: position(rawBoard.position, (index + 1) * 10),
    });
  });
  sortByPosition(boards);

  const validRawLinks = input.links.filter((rawLink) => {
    if (!isRecord(rawLink) || typeof rawLink.url !== 'string') return false;
    return isValidUrl(normalize(rawLink.url));
  });
  if (!boards.length && validRawLinks.length) {
    boards.push({ id: uid('board'), pageId: firstPageId, name: 'Unsorted', position: 10 });
  }
  const firstBoardId = boards[0]?.id;

  let skipped = 0;
  const links: Link[] = [];
  input.links.forEach((rawLink, index) => {
    if (!isRecord(rawLink) || typeof rawLink.url !== 'string') {
      skipped += 1;
      return;
    }
    const url = normalize(rawLink.url);
    if (!isValidUrl(url) || !firstBoardId) {
      skipped += 1;
      return;
    }
    const mappedBoardId = typeof rawLink.boardId === 'string' ? boardIdMap.get(rawLink.boardId) : undefined;
    links.push({
      id: uid('link'),
      boardId: mappedBoardId ?? firstBoardId,
      title: text(rawLink.title, new URL(url).hostname.replace(/^www\./, '')),
      url,
      ...(optionalText(rawLink.note) ? { note: optionalText(rawLink.note) } : {}),
      ...(typeof rawLink.pinned === 'boolean' ? { pinned: rawLink.pinned } : {}),
      position: position(rawLink.position, (index + 1) * 10),
      createdAt: timestamp(rawLink.createdAt),
    });
  });
  sortByPosition(links);

  const rawSettings = isRecord(input.settings) ? input.settings : {};
  const settings: Settings = {
    wallpaper: text(rawSettings.wallpaper, DEFAULT_SETTINGS.wallpaper),
    surface: rawSettings.surface === 'light' || rawSettings.surface === 'dark'
      ? rawSettings.surface
      : DEFAULT_SETTINGS.surface,
  };

  return {
    state: { version: APP_VERSION, pages, boards, links, settings },
    imported: links.length,
    skipped,
  };
}
