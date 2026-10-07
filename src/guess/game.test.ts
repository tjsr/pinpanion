import { BOARD_SIZE, CODE_PATTERN, boardIndexes, generateGame, targetIndex, validPinsFrom } from './game.ts';
import { describe, expect, it } from 'vitest';
import type { Pin } from '../types.ts';

const pins = Array.from({ length: 60 }, (_, index) => ({ image_name: `pin-${index}.webp`, name: `Pin ${index}` })) as Pin[];

describe('Guess Who game generation', () => {
  it('filters invalid pins without relying on IDs', () => {
    const valid = validPinsFrom({ pins: [null, { id: 999, image_name: 'good.webp', name: 'Good' }, { image_name: 'bad.webp', name: '' }, { image_name: '../bad.webp', name: 'Unsafe' }] });
    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe(999);
  });

  it('accepts only the specified code alphabet', () => {
    expect(CODE_PATTERN.test('XY6D')).toBe(true);
    expect(CODE_PATTERN.test('XY8D')).toBe(false);
  });

  it('creates repeatable, distinct boards and targets within them', () => {
    const first = boardIndexes('XY6D', 1, pins.length);
    expect(first).toEqual(boardIndexes('XY6D', 1, pins.length));
    expect(first).toHaveLength(BOARD_SIZE);
    expect(new Set(first).size).toBe(BOARD_SIZE);
    expect(first).not.toEqual(boardIndexes('XY6D', 2, pins.length));
    const game = generateGame('XY6D', pins);
    expect(game.targets[1]).toBe(game.boards[1][targetIndex('XY6D', 1)]);
    expect(game.targets[2]).toBe(game.boards[2][targetIndex('XY6D', 2)]);
  });
});
