import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import { filterLinks } from '../lib/search';
import { hostOf } from '../lib/url';
import type { Link } from '../types';
import { FaviconTile } from './FaviconTile';

interface SearchOverlayProps {
  links: Link[];
  onClose: () => void;
}

export function SearchOverlay({ links, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = filterLinks(links, query);
  const results = query.trim()
    ? matches
    : matches.slice().sort((left, right) => right.createdAt - left.createdAt);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (query) setQuery('');
        else onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [onClose, query]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const openResult = (link: Link) => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => results.length ? (index + 1) % results.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
    } else if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault();
      openResult(results[selectedIndex]);
    }
  };

  return (
    <div className="overlay overlay--search" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <h2 className="sr-only" id="search-title">Search bookmarks</h2>
        <div className="search-panel__input-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="5.5" />
            <path d="m15 15 4 4" />
          </svg>
          <input
            ref={inputRef}
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search titles, URLs, and notes…"
            aria-label="Search titles, URLs, and notes"
            aria-activedescendant={results[selectedIndex] ? `search-result-${results[selectedIndex].id}` : undefined}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="search-panel__body">
          <p className="search-panel__label">
            {!links.length
              ? 'SEARCH'
              : query.trim()
                ? `${results.length} MATCH${results.length === 1 ? '' : 'ES'}`
                : 'RECENT LINKS'}
          </p>
          {results.length ? (
            <div className="search-results" role="listbox" aria-label="Search results">
              {results.map((link, index) => (
                <a
                  className={`search-result${index === selectedIndex ? ' search-result--selected' : ''}`}
                  id={`search-result-${link.id}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={onClose}
                  key={link.id}
                >
                  <FaviconTile title={link.title} url={link.url} size={29} />
                  <span className="search-result__copy">
                    <strong>{link.title}</strong>
                    <small>{hostOf(link.url)}</small>
                  </span>
                  <span className="search-result__arrow" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="search-panel__empty">
              <span aria-hidden="true">⌕</span>
              <strong>{links.length ? 'No matching links' : 'Nothing to search yet'}</strong>
              <small>
                {links.length
                  ? 'Try a title, URL, or word from a note.'
                  : 'Add a link or load the demo workspace first.'}
              </small>
            </div>
          )}
        </div>
        <footer className="search-panel__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> clear</span>
        </footer>
      </section>
    </div>
  );
}
