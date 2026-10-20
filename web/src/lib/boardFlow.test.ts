import { describe, expect, it } from 'vitest';
import {
  ADD_BOARD_HEIGHT,
  BOARD_GAP,
  createBoardFlow,
  estimateBoardHeight,
} from './boardFlow';

describe('createBoardFlow', () => {
  it('matches the canonical three-board shortest-column arrangement', () => {
    const general = estimateBoardHeight([true, false]);
    const essentials = estimateBoardHeight([false, false]);
    const testing = estimateBoardHeight([]);
    const layout = createBoardFlow([
      { id: 'general', height: general },
      { id: 'essentials', height: essentials },
      { id: 'testing', height: testing },
    ], 3);

    expect([general, essentials, testing]).toEqual([119, 106, 86]);
    expect(layout.boards.map(({ id, column, top }) => ({ id, column, top }))).toEqual([
      { id: 'general', column: 0, top: 0 },
      { id: 'essentials', column: 1, top: 0 },
      { id: 'testing', column: 2, top: 0 },
    ]);
    expect(layout.addBoard).toMatchObject({ column: 2, top: testing + BOARD_GAP, height: ADD_BOARD_HEIGHT });
  });

  it('places Add Board in the next empty column for one or two boards', () => {
    const one = createBoardFlow([{ id: 'one', height: 100 }], 3);
    const two = createBoardFlow([
      { id: 'one', height: 100 },
      { id: 'two', height: 90 },
    ], 3);

    expect(one.addBoard).toMatchObject({ column: 1, top: 0 });
    expect(two.addBoard).toMatchObject({ column: 2, top: 0 });
  });

  it('uses the first column when shortest heights are equal', () => {
    const layout = createBoardFlow([
      { id: 'one', height: 100 },
      { id: 'two', height: 100 },
      { id: 'three', height: 100 },
    ], 3);

    expect(layout.addBoard).toMatchObject({ column: 0, top: 100 + BOARD_GAP });
  });

  it('collapses to one column in logical order with Add Board last', () => {
    const layout = createBoardFlow([
      { id: 'one', height: 80 },
      { id: 'two', height: 90 },
      { id: 'three', height: 70 },
    ], 1);

    expect(layout.boards.map(({ id, column, top }) => ({ id, column, top }))).toEqual([
      { id: 'one', column: 0, top: 0 },
      { id: 'two', column: 0, top: 80 + BOARD_GAP },
      { id: 'three', column: 0, top: 80 + BOARD_GAP + 90 + BOARD_GAP },
    ]);
    expect(layout.addBoard.top).toBe(80 + 90 + 70 + (3 * BOARD_GAP));
  });
});
