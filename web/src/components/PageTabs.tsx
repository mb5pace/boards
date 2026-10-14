import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ID, Page } from '../types';

interface PageTabsProps {
  pages: Page[];
  activeId: ID;
  onSelect: (id: ID) => void;
  onAdd: () => void;
  onRename: (id: ID, name: string) => void;
}

export function PageTabs({ pages, activeId, onSelect, onAdd, onRename }: PageTabsProps) {
  const [renamingId, setRenamingId] = useState<ID | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renamingId]);

  const startRename = (page: Page) => {
    setRenamingId(page.id);
    setDraft(page.name);
  };

  const finishRename = () => {
    if (!renamingId) return;
    const id = renamingId;
    const name = draft.trim();
    setRenamingId(null);
    if (name) onRename(id, name);
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    finishRename();
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setRenamingId(null);
  };

  return (
    <nav className="page-tabs" aria-label="Pages">
      <div className="page-tabs__list" role="tablist" aria-label="Bookmark pages">
        {pages
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((page) => renamingId === page.id ? (
            <form className="page-tab page-tab--rename" onSubmit={submitRename} key={page.id}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={finishRename}
                aria-label={`Rename ${page.name}`}
                maxLength={40}
              />
            </form>
          ) : (
            <button
              className={`page-tab${page.id === activeId ? ' page-tab--active' : ''}`}
              type="button"
              role="tab"
              aria-selected={page.id === activeId}
              key={page.id}
              onClick={() => onSelect(page.id)}
              onDoubleClick={() => startRename(page)}
              title="Double-click to rename"
            >
              {page.name}
            </button>
          ))}
      </div>
      <button className="page-tab page-tab--add" type="button" onClick={onAdd} aria-label="Add page">
        <span aria-hidden="true">+</span>
      </button>
    </nav>
  );
}
