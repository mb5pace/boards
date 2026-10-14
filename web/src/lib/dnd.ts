import type { ID } from '../types';

export type DragItemData =
  | { type: 'link'; linkId: ID; boardId: ID; label: string }
  | { type: 'board'; boardId: ID; pageId: ID; label: string }
  | { type: 'page'; pageId: ID; label: string }
  | { type: 'add-board'; pageId: ID; label: string };

export function linkDragId(id: ID): string {
  return `link:${id}`;
}

export function boardDragId(id: ID): string {
  return `board:${id}`;
}

export function pageDropId(pageId: ID): string {
  return `page:${pageId}`;
}

export function addBoardDropId(pageId: ID): string {
  return `add-board:${pageId}`;
}

export function asDragItemData(value: unknown): DragItemData | null {
  if (!value || typeof value !== 'object' || !('type' in value)) return null;
  const candidate = value as Partial<DragItemData>;

  if (candidate.type === 'link' && 'linkId' in candidate && 'boardId' in candidate) {
    return candidate as Extract<DragItemData, { type: 'link' }>;
  }
  if (candidate.type === 'board' && 'boardId' in candidate && 'pageId' in candidate) {
    return candidate as Extract<DragItemData, { type: 'board' }>;
  }
  if (candidate.type === 'page' && 'pageId' in candidate) {
    return candidate as Extract<DragItemData, { type: 'page' }>;
  }
  if (candidate.type === 'add-board' && 'pageId' in candidate) {
    return candidate as Extract<DragItemData, { type: 'add-board' }>;
  }
  return null;
}
