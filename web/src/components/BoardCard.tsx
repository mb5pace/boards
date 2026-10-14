import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react';
import { boardDragId, linkDragId } from '../lib/dnd';
import type { Board, Link } from '../types';
import { LinkRow } from './LinkRow';

interface BoardCardProps {
  board: Board;
  links: Link[];
  dropTarget: boolean;
  onAddLink: (boardId: Board['id']) => void;
  onRename: (boardId: Board['id'], name: string) => void;
  onDeleteBoard: (board: Board) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (link: Link) => void;
}

export function BoardCard({
  board,
  links,
  dropTarget,
  onAddLink,
  onRename,
  onDeleteBoard,
  onEditLink,
  onDeleteLink,
}: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(board.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const titleId = `board-title-${board.id}`;
  const sortedLinks = links.slice().sort((a, b) => a.position - b.position);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: boardDragId(board.id),
    data: { type: 'board', boardId: board.id, pageId: board.pageId, label: board.name },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  useEffect(() => setDraftName(board.name), [board.name]);

  const startRename = () => {
    setMenuOpen(false);
    setDraftName(board.name);
    setRenaming(true);
  };

  const finishRename = () => {
    if (!renaming) return;
    const nextName = draftName.trim();
    setRenaming(false);
    if (nextName && nextName !== board.name) onRename(board.id, nextName);
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    finishRename();
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setDraftName(board.name);
      setRenaming(false);
    }
  };

  return (
    <section
      ref={setNodeRef}
      className={`board-card${dropTarget ? ' board-card--drop-target' : ''}${isDragging ? ' board-card--dragging' : ''}`}
      aria-labelledby={titleId}
      style={style}
    >
      <header className="board-card__header">
        {renaming ? (
          <form className="board-card__rename" onSubmit={submitRename}>
            <input
              ref={renameInputRef}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={finishRename}
              onKeyDown={handleRenameKeyDown}
              aria-label={`Rename ${board.name}`}
              maxLength={60}
            />
          </form>
        ) : (
          <h2 className="board-card__title" id={titleId} onDoubleClick={startRename} title="Double-click to rename">
            {board.emoji ? <span className="board-card__emoji" aria-hidden="true">{board.emoji}</span> : null}
            <span>{board.name}</span>
          </h2>
        )}
        <div className="board-card__header-actions">
          <button
            ref={setActivatorNodeRef}
            className="board-card__drag-handle"
            type="button"
            aria-label={`Drag ${board.name}`}
            title="Drag to reorder board"
            {...attributes}
            {...listeners}
          >
            <span aria-hidden="true">⠿</span>
          </button>
          <div className="board-card__menu-wrap">
            <button
              className="board-card__menu-button"
              type="button"
              aria-label={`Open menu for ${board.name}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">•••</span>
            </button>
            {menuOpen ? (
              <div className="board-card__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onAddLink(board.id);
                  }}
                >
                  Add link
                </button>
                <button type="button" role="menuitem" onClick={startRename}>Rename board</button>
                <button
                  className="board-card__menu-danger"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteBoard(board);
                  }}
                >
                  Delete board
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <SortableContext
        items={sortedLinks.map((link) => linkDragId(link.id))}
        strategy={verticalListSortingStrategy}
      >
        {sortedLinks.length ? (
          <div className="board-card__links" role="list">
            {sortedLinks.map((link, index) => (
              <LinkRow
                key={link.id}
                link={link}
                showHost={Boolean(link.note) || index === 0}
                onEdit={onEditLink}
                onDelete={onDeleteLink}
              />
            ))}
          </div>
        ) : (
          <div className="board-card__empty">
            <span className="board-card__empty-icon" aria-hidden="true">↳</span>
            <strong>No links yet</strong>
            <small>Add one now, or drop a link here.</small>
            <button type="button" onClick={() => onAddLink(board.id)}>Add first link</button>
          </div>
        )}
      </SortableContext>

      <button className="board-card__add-link" type="button" onClick={() => onAddLink(board.id)}>
        <span aria-hidden="true">+</span> Add link
      </button>
    </section>
  );
}
