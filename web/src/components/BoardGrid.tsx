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
  KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  BOARD_GAP,
  BOARD_WIDTH,
  createBoardFlow,
  estimateBoardHeight,
} from '../lib/boardFlow';
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

interface FlowGridStyle extends CSSProperties {
  '--flow-height-3': string;
  '--flow-height-2': string;
}

interface FlowItemStyle extends CSSProperties {
  '--flow-left-3': string;
  '--flow-top-3': string;
  '--flow-left-2': string;
  '--flow-top-2': string;
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

function isValidDropTarget(active: DragItemData | null, candidate: DragItemData | null): boolean {
  if (!active || !candidate) return false;
  if (active.type === 'board') return candidate.type === 'board' || candidate.type === 'page';
  return candidate.type === 'link' || candidate.type === 'board' || candidate.type === 'add-board';
}

const collisionDetection: CollisionDetection = (args) => {
  const activeData = asDragItemData(args.active.data.current);
  const validContainers = args.droppableContainers.filter((container) => (
    isValidDropTarget(activeData, asDragItemData(container.data.current))
  ));

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

const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const activeData = asDragItemData(args.context.active?.data.current);
  const containers = args.context.droppableContainers;
  const enabled = containers.getEnabled().filter((container) => (
    isValidDropTarget(activeData, asDragItemData(container.data.current))
  ));
  const filteredContainers = {
    getEnabled: () => enabled,
    get: (id: Parameters<typeof containers.get>[0]) => containers.get(id),
  } as typeof containers;

  return sortableKeyboardCoordinates(event, {
    ...args,
    context: { ...args.context, droppableContainers: filteredContainers },
  });
};

function placementStyle(
  desktop: { column: number; top: number },
  tablet: { column: number; top: number },
): FlowItemStyle {
  return {
    '--flow-left-3': `${desktop.column * (BOARD_WIDTH + BOARD_GAP)}px`,
    '--flow-top-3': `${desktop.top}px`,
    '--flow-left-2': `${tablet.column * (BOARD_WIDTH + BOARD_GAP)}px`,
    '--flow-top-2': `${tablet.top}px`,
  };
}

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
  const linksByBoard = new Map<ID, Link[]>();
  sortedBoards.forEach((board) => {
    linksByBoard.set(
      board.id,
      links
        .filter((link) => link.boardId === board.id)
        .sort((left, right) => left.position - right.position),
    );
  });

  const flowItems = sortedBoards.map((board) => ({
    id: board.id,
    height: estimateBoardHeight((linksByBoard.get(board.id) ?? []).map((link) => Boolean(link.note?.trim()))),
  }));
  const desktopFlow = createBoardFlow(flowItems, 3);
  const tabletFlow = createBoardFlow(flowItems, 2);
  const desktopById = new Map(desktopFlow.boards.map((item) => [item.id, item]));
  const tabletById = new Map(tabletFlow.boards.map((item) => [item.id, item]));
  const gridStyle: FlowGridStyle = {
    '--flow-height-3': `${desktopFlow.height}px`,
    '--flow-height-2': `${tabletFlow.height}px`,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
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
        <div
          className={`board-grid${sortedBoards.length ? '' : ' board-grid--empty'}`}
          style={sortedBoards.length ? gridStyle : undefined}
        >
          {!sortedBoards.length ? (
            <>
              <EmptyPageState onCreateBoard={() => onAddBoard('My first board')} />
              <AddBoardTile pageId={pageId} onAdd={onAddBoard} />
            </>
          ) : (
            <>
              {sortedBoards.map((board) => {
                const desktop = desktopById.get(board.id);
                const tablet = tabletById.get(board.id);
                if (!desktop || !tablet) return null;
                return (
                  <div
                    className="board-grid__item"
                    style={placementStyle(desktop, tablet)}
                    key={board.id}
                  >
                    <BoardCard
                      board={board}
                      links={linksByBoard.get(board.id) ?? []}
                      dropTarget={overBoardId === board.id}
                      onAddLink={onAddLink}
                      onRename={onRenameBoard}
                      onDeleteBoard={onDeleteBoard}
                      onEditLink={onEditLink}
                      onDeleteLink={onDeleteLink}
                    />
                  </div>
                );
              })}
              <div
                className="board-grid__item board-grid__item--add"
                style={placementStyle(desktopFlow.addBoard, tabletFlow.addBoard)}
              >
                <AddBoardTile pageId={pageId} onAdd={onAddBoard} />
              </div>
            </>
          )}
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
