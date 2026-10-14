export type ID = string;

export interface Page {
  id: ID;
  name: string;
  position: number;
}

export interface Board {
  id: ID;
  pageId: ID;
  name: string;
  emoji?: string;
  position: number;
}

export interface Link {
  id: ID;
  boardId: ID;
  title: string;
  url: string;
  note?: string;
  pinned?: boolean;
  position: number;
  createdAt: number;
}

export interface Settings {
  wallpaper: string;
  surface: 'dark' | 'light';
}

export interface AppState {
  version: 1;
  pages: Page[];
  boards: Board[];
  links: Link[];
  settings: Settings;
}
