import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { AddLinkDialog } from './components/AddLinkDialog';
import type { AddLinkDraft } from './components/AddLinkDialog';
import { AppShell } from './components/AppShell';
import { BoardGrid } from './components/BoardGrid';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FirstRunState } from './components/EmptyStates';
import { FloatingControls } from './components/FloatingControls';
import type { ActiveControl } from './components/FloatingControls';
import { PageTabs } from './components/PageTabs';
import { SearchOverlay } from './components/SearchOverlay';
import { SettingsPanel } from './components/SettingsPanel';
import type { SettingsTab } from './components/SettingsPanel';
import { Toast } from './components/Toast';
import { asDragItemData } from './lib/dnd';
import { hostOf } from './lib/url';
import { isDemoMode, repo, subscribeStorageError } from './storage/repo';
import type { AppState, Board, ID, Link } from './types';

type Overlay =
  | { kind: 'link'; boardId?: ID; link?: Link }
  | { kind: 'search' }
  | { kind: 'settings'; tab: SettingsTab }
  | {
      kind: 'confirm';
      title: string;
      body: string;
      confirmLabel: string;
      confirmationText?: string;
      action: () => void;
    }
  | null;

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function preferredPageId(state: AppState): ID {
  return state.pages.find((page) => page.name.toLowerCase() === 'home')?.id ?? state.pages[0].id;
}

function byPosition<T extends { position: number }>(items: T[]): T[] {
  return items.slice().sort((left, right) => left.position - right.position);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => repo.load());
  const [activePageId, setActivePageId] = useState<ID>(() => preferredPageId(appState));
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => subscribeStorageError(setStorageError), []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOverlay({ kind: 'search' });
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, []);

  const syncFromRepo = (nextActivePageId?: ID) => {
    const nextState = repo.load();
    setAppState(nextState);
    setActivePageId((currentId) => {
      const requestedId = nextActivePageId ?? currentId;
      return nextState.pages.some((page) => page.id === requestedId)
        ? requestedId
        : preferredPageId(nextState);
    });
    return nextState;
  };

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ id: Date.now(), message, actionLabel, onAction });
  };

  const activeBoards = appState.boards.filter((board) => board.pageId === activePageId);
  const defaultBoardId = activeBoards[0]?.id ?? appState.boards[0]?.id;
  const isFirstRun = appState.boards.length === 0 && appState.links.length === 0;

  const addPage = () => {
    const page = repo.addPage(`Page ${appState.pages.length + 1}`);
    syncFromRepo(page.id);
    showToast('Page created · double-click its name to rename');
  };

  const renamePage = (id: ID, name: string) => {
    repo.renamePage(id, name);
    syncFromRepo();
  };

  const addBoard = (name: string) => {
    repo.addBoard(activePageId, name);
    syncFromRepo();
    showToast(`Created “${name}”`);
  };

  const renameBoard = (id: ID, name: string) => {
    repo.renameBoard(id, name);
    syncFromRepo();
  };

  const createFirstBoard = () => {
    const board = repo.addBoard(activePageId, 'My first board');
    syncFromRepo();
    showToast(`Created “${board.name}” · double-click to rename`);
  };

  const loadDemoFromFirstRun = () => {
    repo.loadDemo();
    const next = syncFromRepo();
    setActivePageId(preferredPageId(next));
    showToast('Demo workspace loaded');
  };

  const requestDeleteBoard = (board: Board) => {
    setOverlay({
      kind: 'confirm',
      title: `Delete “${board.name}”?`,
      body: 'This also removes every link in the board. This action cannot be undone.',
      confirmLabel: 'Delete board',
      action: () => {
        repo.deleteBoard(board.id);
        syncFromRepo();
        showToast(`Deleted “${board.name}”`);
      },
    });
  };

  const requestDeleteLink = (link: Link) => {
    repo.deleteLink(link.id);
    syncFromRepo();
    showToast(`Deleted “${link.title}”`, 'Undo', () => {
      const current = repo.load();
      if (!current.boards.some((board) => board.id === link.boardId)) {
        showToast('The original board no longer exists.');
        return;
      }
      repo.save({
        ...current,
        links: [...current.links.filter((item) => item.id !== link.id), { ...link }],
      });
      syncFromRepo();
      setToast(null);
    });
  };

  const saveLink = (draft: AddLinkDraft) => {
    if (overlay?.kind !== 'link') return;
    try {
      if (overlay.link) {
        repo.updateLink(overlay.link.id, {
          url: draft.url,
          title: draft.title || hostOf(draft.url),
          note: draft.note,
        });
        if (draft.boardId !== overlay.link.boardId) {
          repo.moveLink(overlay.link.id, draft.boardId, 10);
        }
        showToast('Link updated');
      } else {
        repo.addLink(draft);
        showToast('Link saved');
      }
      syncFromRepo();
      setOverlay(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save that link.');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = asDragItemData(event.active.data.current);
    const overData = asDragItemData(event.over?.data.current);
    if (!activeData || !overData) return;

    if (activeData.type === 'board' && overData.type === 'page') {
      const movedBoard = appState.boards.find((board) => board.id === activeData.boardId);
      const targetPage = appState.pages.find((page) => page.id === overData.pageId);
      if (!movedBoard || !targetPage || movedBoard.pageId === targetPage.id) return;

      const remainingSourceBoards = byPosition(
        appState.boards.filter((board) => board.pageId === movedBoard.pageId && board.id !== movedBoard.id),
      );
      const targetBoards = byPosition(appState.boards.filter((board) => board.pageId === targetPage.id));
      remainingSourceBoards.forEach((board, index) => {
        repo.moveBoard(board.id, movedBoard.pageId, (index + 1) * 10);
      });
      repo.moveBoard(movedBoard.id, targetPage.id, (targetBoards.length + 1) * 10);
      syncFromRepo(targetPage.id);
      showToast(`Moved “${movedBoard.name}” to ${targetPage.name}`);
      return;
    }

    if (activeData.type === 'board' && overData.type === 'board') {
      const pageBoards = byPosition(appState.boards.filter((board) => board.pageId === activeData.pageId));
      const oldIndex = pageBoards.findIndex((board) => board.id === activeData.boardId);
      const newIndex = pageBoards.findIndex((board) => board.id === overData.boardId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      arrayMove(pageBoards, oldIndex, newIndex).forEach((board, index) => {
        repo.moveBoard(board.id, activeData.pageId, (index + 1) * 10);
      });
      syncFromRepo();
      return;
    }

    if (activeData.type !== 'link') return;
    const activeLink = appState.links.find((link) => link.id === activeData.linkId);
    if (!activeLink) return;

    if (overData.type === 'add-board') {
      const board = repo.addBoard(overData.pageId, hostOf(activeLink.url));
      const remainingSourceLinks = byPosition(
        appState.links.filter((link) => link.boardId === activeLink.boardId && link.id !== activeLink.id),
      );
      remainingSourceLinks.forEach((link, index) => {
        repo.moveLink(link.id, activeLink.boardId, (index + 1) * 10);
      });
      repo.moveLink(activeLink.id, board.id, 10);
      syncFromRepo(overData.pageId);
      showToast(`Created “${board.name}” and moved the link`);
      return;
    }

    if (overData.type === 'page') return;

    const targetBoardId = overData.boardId;
    if (!appState.boards.some((board) => board.id === targetBoardId)) return;

    const sourceLinks = byPosition(appState.links.filter((link) => link.boardId === activeLink.boardId));
    if (targetBoardId === activeLink.boardId) {
      const oldIndex = sourceLinks.findIndex((link) => link.id === activeLink.id);
      const newIndex = overData.type === 'link'
        ? sourceLinks.findIndex((link) => link.id === overData.linkId)
        : sourceLinks.length - 1;
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      arrayMove(sourceLinks, oldIndex, newIndex).forEach((link, index) => {
        repo.moveLink(link.id, targetBoardId, (index + 1) * 10);
      });
      syncFromRepo();
      return;
    }

    const remainingSourceLinks = sourceLinks.filter((link) => link.id !== activeLink.id);
    const targetLinks = byPosition(appState.links.filter((link) => link.boardId === targetBoardId));
    const insertionIndex = overData.type === 'link'
      ? Math.max(0, targetLinks.findIndex((link) => link.id === overData.linkId))
      : targetLinks.length;
    const nextTargetLinks = targetLinks.slice();
    nextTargetLinks.splice(insertionIndex, 0, activeLink);

    remainingSourceLinks.forEach((link, index) => {
      repo.moveLink(link.id, activeLink.boardId, (index + 1) * 10);
    });
    nextTargetLinks.forEach((link, index) => {
      repo.moveLink(link.id, targetBoardId, (index + 1) * 10);
    });
    syncFromRepo();
    const targetBoard = appState.boards.find((board) => board.id === targetBoardId);
    showToast(`Moved to ${targetBoard?.name ?? 'board'}`);
  };

  const exportData = () => {
    const blob = new Blob([repo.exportJson()], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = downloadUrl;
    anchor.download = `boards-backup-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    showToast('Backup exported');
  };

  const requestImport = (text: string) => {
    setOverlay({
      kind: 'confirm',
      title: 'Replace with this backup?',
      body: 'The file will be validated first. Valid imported data replaces the current workspace.',
      confirmLabel: 'Import backup',
      action: () => {
        const result = repo.importJson(text);
        if (result.error) {
          showToast(result.error);
          return;
        }
        syncFromRepo();
        showToast(`Imported ${result.imported} links · skipped ${result.skipped}`);
      },
    });
  };

  const requestDemo = () => {
    setOverlay({
      kind: 'confirm',
      title: 'Load demo data?',
      body: 'This replaces the current workspace with the example pages, boards, and links.',
      confirmLabel: 'Load demo',
      action: () => {
        repo.loadDemo();
        const next = syncFromRepo();
        setActivePageId(preferredPageId(next));
        showToast('Demo workspace loaded');
      },
    });
  };

  const requestReset = () => {
    setOverlay({
      kind: 'confirm',
      title: 'Reset everything?',
      body: 'This permanently removes every page, board, link, and appearance setting from this browser.',
      confirmLabel: 'Reset everything',
      confirmationText: 'RESET',
      action: () => {
        repo.reset();
        const next = syncFromRepo();
        setActivePageId(preferredPageId(next));
        showToast('Boards was reset');
      },
    });
  };

  const updateSettings = (patch: Partial<AppState['settings']>) => {
    repo.updateSettings(patch);
    syncFromRepo();
  };

  const confirmOverlayAction = () => {
    if (overlay?.kind !== 'confirm') return;
    const action = overlay.action;
    setOverlay(null);
    action();
  };

  const activeControl: ActiveControl =
    overlay?.kind === 'link'
      ? 'add'
      : overlay?.kind === 'search'
        ? 'search'
        : overlay?.kind === 'settings' && overlay.tab === 'appearance'
          ? 'appearance'
          : overlay?.kind === 'settings'
            ? 'settings'
            : null;

  return (
    <AppShell settings={appState.settings}>
      <header className="topbar">
        <div className="topbar__inner">
          <PageTabs
            pages={appState.pages}
            activeId={activePageId}
            onSelect={setActivePageId}
            onAdd={addPage}
            onRename={renamePage}
          />
          {isDemoMode ? <span className="mode-pill">DEMO · MEMORY ONLY</span> : null}
        </div>
      </header>

      {storageError ? (
        <div className="storage-banner" role="alert">
          <span>{storageError}</span>
          <button type="button" onClick={exportData}>Export now</button>
        </div>
      ) : null}

      <section className="workspace" aria-labelledby="workspace-title">
        <h1 className="sr-only" id="workspace-title">
          {appState.pages.find((page) => page.id === activePageId)?.name ?? 'Boards'} bookmarks
        </h1>
        {isFirstRun ? (
          <FirstRunState onLoadDemo={loadDemoFromFirstRun} onCreateBoard={createFirstBoard} />
        ) : (
          <BoardGrid
            pageId={activePageId}
            pages={appState.pages}
            boards={activeBoards}
            links={appState.links}
            onAddBoard={addBoard}
            onAddLink={(boardId) => setOverlay({ kind: 'link', boardId })}
            onRenameBoard={renameBoard}
            onDeleteBoard={requestDeleteBoard}
            onEditLink={(link) => setOverlay({ kind: 'link', boardId: link.boardId, link })}
            onDeleteLink={requestDeleteLink}
            onDragEnd={handleDragEnd}
          />
        )}
      </section>

      <FloatingControls
        active={activeControl}
        onAddLink={() => defaultBoardId
          ? setOverlay({ kind: 'link', boardId: defaultBoardId })
          : showToast('Create a board before adding a link')}
        onSearch={() => setOverlay({ kind: 'search' })}
        onSettings={() => setOverlay({ kind: 'settings', tab: 'general' })}
        onWallpaper={() => setOverlay({ kind: 'settings', tab: 'appearance' })}
      />

      {overlay?.kind === 'link' ? (
        <AddLinkDialog
          boards={appState.boards}
          defaultBoardId={overlay.boardId}
          initial={overlay.link}
          onSubmit={saveLink}
          onClose={() => setOverlay(null)}
        />
      ) : null}

      {overlay?.kind === 'search' ? (
        <SearchOverlay links={appState.links} onClose={() => setOverlay(null)} />
      ) : null}

      {overlay?.kind === 'settings' ? (
        <SettingsPanel
          settings={appState.settings}
          initialTab={overlay.tab}
          counts={{
            pages: appState.pages.length,
            boards: appState.boards.length,
            links: appState.links.length,
          }}
          demoMode={isDemoMode}
          onClose={() => setOverlay(null)}
          onUpdateSettings={updateSettings}
          onExport={exportData}
          onImport={requestImport}
          onDemo={requestDemo}
          onReset={requestReset}
        />
      ) : null}

      {overlay?.kind === 'confirm' ? (
        <ConfirmDialog
          title={overlay.title}
          body={overlay.body}
          confirmLabel={overlay.confirmLabel}
          confirmationText={overlay.confirmationText}
          onConfirm={confirmOverlayAction}
          onClose={() => setOverlay(null)}
        />
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </AppShell>
  );
}
