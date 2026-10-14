import { useDroppable } from '@dnd-kit/core';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { addBoardDropId } from '../lib/dnd';
import type { ID } from '../types';

interface AddBoardTileProps {
  pageId: ID;
  onAdd: (name: string) => void;
}

export function AddBoardTile({ pageId, onAdd }: AddBoardTileProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOver, setNodeRef } = useDroppable({
    id: addBoardDropId(pageId),
    data: { type: 'add-board', pageId, label: 'Add board' },
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setEditing(false);
    setName('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onAdd(cleanName);
    cancel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <form
        ref={setNodeRef}
        className={`add-board-tile add-board-tile--editing${isOver ? ' add-board-tile--over' : ''}`}
        onSubmit={submit}
      >
        <label htmlFor="new-board-name">Board name</label>
        <input
          id="new-board-name"
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Inspiration"
          maxLength={60}
        />
        <div className="add-board-tile__actions">
          <button type="button" onClick={cancel}>Cancel</button>
          <button type="submit" disabled={!name.trim()}>Create</button>
        </div>
      </form>
    );
  }

  return (
    <button
      ref={setNodeRef}
      className={`add-board-tile${isOver ? ' add-board-tile--over' : ''}`}
      type="button"
      onClick={() => setEditing(true)}
    >
      <span className="add-board-tile__icon" aria-hidden="true">+</span>
      <span>{isOver ? 'DROP TO CREATE BOARD' : 'ADD BOARD'}</span>
    </button>
  );
}
