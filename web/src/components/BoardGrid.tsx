import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { asDragItemData, boardDragId, pageDropId } from '../lib/dnd';
import type { DragItemData } from '../lib/dnd';
import type { Board, ID, Link, Page } from '../types';
import { AddBoardTile } from './AddBoardTile';
import { BoardCard } from './BoardCard';
import { EmptyPageState } from './EmptyStates';

interface BoardGridProps {
  pageId: ID;
  pages: Page[];
  boards: Board[];
  links: Link[];
  onAddBoard: (name: string) => void;
  onAddLink: (boardId: ID) => void;
  onRenameBoard: (boardId: ID, name: string) => void;
  onDeleteBoard: (board: Board) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (link: Link) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

function PageDropTarget({ page }: { page: Page }) {
  const data: DragItemData = { type: 'page', pageId: page.id, label: page.name };
  const { isOver, setNodeRef } = useDroppable({
    id: pageDropId(page.id),
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={`board-page-target${isOver ? ' board-page-target--over' : ''}`}
      role="button"
      aria-label={`Move board to ${page.name}`}
    >
      <span>Move to</span>
      <strong>{page.name}</strong>
    </div>
  );
}

const collisionDetection: CollisionDetection = (args) => {
  const activeData = asDragItemData(args.active.data.current);
  const validContainers = args.droppableContainers.filter((container) => {
    const candidate = asDragItemData(container.data.current);
    if (!activeData || !candidate) return false;
    if (activeData.type === 'board') return candidate.type === 'board' || candidate.type === 'page';
    return candidate.type === 'link' || candidate.type === 'board' || candidate.type === 'add-board';
  });

  const pointerCollisions = pointerWithin({ ...args, droppableContainers: validContainers });
  if (pointerCollisions.length) {
    if (activeData?.type === 'link') {
      const priority: Record<DragItemData['type'], number> = { link: 0, 'add-board': 1, board: 2, page: 3 };
      return pointerCollisions.sort((left, right) => {
        const leftType = asDragItemData(validContainers.find((item) => item.id === left.id)?.data.current)?.type ?? 'board';
        const rightType = asDragItemData(validContainers.find((item) => item.id === right.id)?.data.current)?.type ?? 'board';
        return priority[leftType] - priority[rightType];
      });
    }
    return pointerCollisions;
  }

  return closestCenter({ ...args, droppableContainers: validContainers });
};

export function BoardGrid({
  pageId,
  pages,
  boards,
  links,
  onAddBoard,
  onAddLink,
  onRenameBoard,
  onDeleteBoard,
  onEditLink,
  onDeleteLink,
  onDragEnd,
}: BoardGridProps) {
  const [activeItem, setActiveItem] = useState<DragItemData | null>(null);
  const [overBoardId, setOverBoardId] = useState<ID | null>(null);
  const sortedBoards = boards.slice().sort((a, b) => a.position - b.position);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const clearDragState = () => {
    setActiveItem(null);
    setOverBoardId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(asDragItemData(event.active.data.current));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeData = asDragItemData(event.active.data.current);
    const overData = asDragItemData(event.over?.data.current);
    if (activeData?.type !== 'link' || !overData) {
      setOverBoardId(null);
      return;
    }
    if (overData.type === 'link' || overData.type === 'board') {
      setOverBoardId(overData.boardId);
    } else {
      setOverBoardId(null);
    }
  };

  const finishDrag = (event: DragEndEvent) => {
    onDragEnd(event);
    clearDragState();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={finishDrag}
      onDragCancel={clearDragState}
    >
      {activeItem?.type === 'board' ? (
        <div className="board-page-targets" aria-label="Move board to another page">
          {pages
            .filter((page) => page.id !== activeItem.pageId)
            .sort((left, right) => left.position - right.position)
            .map((page) => <PageDropTarget key={page.id} page={page} />)}
        </div>
      ) : null}

      <SortableContext items={sortedBoards.map((board) => boardDragId(board.id))} strategy={rectSortingStrategy}>
        <div className={`board-grid${sortedBoards.length ? '' : ' board-grid--empty'}`}>
          {!sortedBoards.length ? (
            <EmptyPageState onCreateBoard={() => onAddBoard('My first board')} />
          ) : null}
          {sortedBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              links={links.filter((link) => link.boardId === board.id)}
              dropTarget={overBoardId === board.id}
              onAddLink={onAddLink}
              onRename={onRenameBoard}
              onDeleteBoard={onDeleteBoard}
              onEditLink={onEditLink}
              onDeleteLink={onDeleteLink}
            />
          ))}
          <AddBoardTile pageId={pageId} onAdd={onAddBoard} />
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
        {activeItem ? (
          <div className={`drag-overlay drag-overlay--${activeItem.type}`}>
            <span aria-hidden="true">{activeItem.type === 'board' ? '⠿' : '↕'}</span>
            <strong>{activeItem.label}</strong>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
