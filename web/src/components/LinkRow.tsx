import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { linkDragId } from '../lib/dnd';
import { hostOf } from '../lib/url';
import type { Link } from '../types';
import { FaviconTile } from './FaviconTile';

interface LinkRowProps {
  link: Link;
  showHost?: boolean;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
}

export function LinkRow({ link, showHost = false, onEdit, onDelete }: LinkRowProps) {
  const host = hostOf(link.url);
  const subtitle = link.note?.trim() || (showHost ? host : '');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: linkDragId(link.id),
    data: { type: 'link', linkId: link.id, boardId: link.boardId, label: link.title },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const stopDragStart = (event: PointerEvent<HTMLButtonElement>) => event.stopPropagation();
  const stopKeyboardDrag = (event: KeyboardEvent<HTMLButtonElement>) => event.stopPropagation();

  return (
    <article
      ref={setNodeRef}
      className={`link-row${subtitle ? ' link-row--with-subtitle' : ''}${isDragging ? ' link-row--dragging' : ''}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      <a
        className="link-row__main"
        href={link.url}
        target="_blank"
        rel="noreferrer"
        title={link.title}
      >
        <FaviconTile title={link.title} url={link.url} size={16} />
        <span className="link-row__copy">
          <span className="link-row__title">{link.title}</span>
          {subtitle ? <span className="link-row__host">{subtitle}</span> : null}
        </span>
        {link.pinned ? <span className="link-row__pin" title="Pinned" aria-label="Pinned" /> : null}
      </a>
      <div className="link-row__actions">
        <button
          type="button"
          onPointerDown={stopDragStart}
          onKeyDown={stopKeyboardDrag}
          onClick={() => onEdit(link)}
          aria-label={`Edit ${link.title}`}
          title="Edit link"
        >
          <span aria-hidden="true">✎</span>
        </button>
        <button
          className="link-row__delete"
          type="button"
          onPointerDown={stopDragStart}
          onKeyDown={stopKeyboardDrag}
          onClick={() => onDelete(link)}
          aria-label={`Delete ${link.title}`}
          title="Delete link"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </article>
  );
}
