export const BOARD_WIDTH = 295;
export const BOARD_GAP = 16;
export const BOARD_HEADER_HEIGHT = 38;
export const EMPTY_BOARD_HEIGHT = 86;
export const SINGLE_LINE_ROW_HEIGHT = 28;
export const TWO_LINE_ROW_HEIGHT = 41;
export const LINK_LIST_VERTICAL_CHROME = 9;
export const ADD_BOARD_HEIGHT = 60;

export interface BoardFlowItem {
  id: string;
  height: number;
}

export interface BoardFlowPlacement extends BoardFlowItem {
  column: number;
  top: number;
}

export interface BoardFlowLayout {
  boards: BoardFlowPlacement[];
  addBoard: BoardFlowPlacement;
  height: number;
}

export function estimateBoardHeight(subtitleRows: readonly boolean[]): number {
  if (!subtitleRows.length) return EMPTY_BOARD_HEIGHT;

  const rowsHeight = subtitleRows.reduce(
    (total, hasSubtitle) => total + (hasSubtitle ? TWO_LINE_ROW_HEIGHT : SINGLE_LINE_ROW_HEIGHT),
    0,
  );
  const rowGaps = Math.max(0, subtitleRows.length - 1);

  // Two outer border pixels + the fixed header + compact list padding.
  return 2 + BOARD_HEADER_HEIGHT + LINK_LIST_VERTICAL_CHROME + rowsHeight + rowGaps;
}

function shortestColumn(heights: readonly number[]): number {
  let shortest = 0;
  for (let column = 1; column < heights.length; column += 1) {
    if (heights[column] < heights[shortest]) shortest = column;
  }
  return shortest;
}

export function createBoardFlow(
  items: readonly BoardFlowItem[],
  columnCount: number,
  gap = BOARD_GAP,
  addBoardHeight = ADD_BOARD_HEIGHT,
): BoardFlowLayout {
  const safeColumnCount = Math.max(1, Math.floor(columnCount));
  const columnHeights = Array.from({ length: safeColumnCount }, () => 0);

  const boards = items.map((item) => {
    const column = shortestColumn(columnHeights);
    const top = columnHeights[column];
    columnHeights[column] = top + item.height + gap;
    return { ...item, column, top };
  });

  const addColumn = shortestColumn(columnHeights);
  const addTop = columnHeights[addColumn];
  const addBoard: BoardFlowPlacement = {
    id: 'add-board',
    column: addColumn,
    top: addTop,
    height: addBoardHeight,
  };
  columnHeights[addColumn] = addTop + addBoardHeight + gap;

  return {
    boards,
    addBoard,
    height: Math.max(0, ...columnHeights) - gap,
  };
}
