import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { isValidUrl, normalize } from '../lib/url';
import type { Board, ID, Link } from '../types';

export interface AddLinkDraft {
  boardId: ID;
  url: string;
  title: string;
  note: string;
}

interface AddLinkDialogProps {
  boards: Board[];
  defaultBoardId?: ID;
  initial?: Link;
  onSubmit: (draft: AddLinkDraft) => void;
  onClose: () => void;
}

export function AddLinkDialog({ boards, defaultBoardId, initial, onSubmit, onClose }: AddLinkDialogProps) {
  const firstBoardId = initial?.boardId ?? defaultBoardId ?? boards[0]?.id ?? '';
  const [boardId, setBoardId] = useState(firstBoardId);
  const [url, setUrl] = useState(initial?.url ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const isEditing = Boolean(initial);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = normalize(url);
    if (!isValidUrl(normalizedUrl)) {
      setError('Enter a valid http or https URL.');
      return;
    }
    setError('');
    onSubmit({ boardId, url: normalizedUrl, title: title.trim(), note: note.trim() });
  };

  return (
    <div className="overlay" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="dialog dialog--add-link" role="dialog" aria-modal="true" aria-labelledby="add-link-title">
        <header className="dialog__header">
          <div>
            <span className="dialog__eyebrow">{isEditing ? 'EDIT BOOKMARK' : 'NEW BOOKMARK'}</span>
            <h2 id="add-link-title">{isEditing ? 'Edit link' : 'Add a link'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close link dialog">×</button>
        </header>

        <form className="dialog__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>URL</span>
            <input
              autoFocus
              required
              inputMode="url"
              type="text"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError('');
              }}
              placeholder="https://example.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'link-url-error' : undefined}
            />
            {error ? <small className="field__error" id="link-url-error">{error}</small> : null}
          </label>

          <label className="field">
            <span>Title <small>optional</small></span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Defaults to the website name"
            />
          </label>

          <label className="field">
            <span>Note <small>optional</small></span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you saving this?"
            />
          </label>

          <label className="field">
            <span>Board</span>
            <select value={boardId} onChange={(event) => setBoardId(event.target.value)} required>
              {boards.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}
            </select>
          </label>

          <footer className="dialog__actions">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={!boardId}>
              {isEditing ? 'Save changes' : 'Save link'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
