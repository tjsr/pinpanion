import { centeredSquare, moveSquare, photoIsValid, resizeSquare } from './scavenger.ts';
import { describe, expect, it } from 'vitest';

describe('Pingo scavenger hunt photos', () => {
  it('accepts photos captured at or after the board was opened', () => {
    const startedAt = 1_791_200_000_000;
    expect(photoIsValid({ capturedAt: startedAt - 1 }, startedAt)).toBe(false);
    expect(photoIsValid({ capturedAt: startedAt }, startedAt)).toBe(true);
    expect(photoIsValid({ capturedAt: startedAt + 30_000 }, startedAt)).toBe(true);
  });

  it('keeps a square crop inside a portrait or landscape camera frame', () => {
    const portrait = centeredSquare(720, 1280);
    expect(portrait.size).toBe(468);
    expect(portrait.x).toBe(126);
    expect(moveSquare(portrait, -500, 900, 720, 1280)).toMatchObject({ x: 0, y: 812 });
    expect(resizeSquare(portrait, 500, 720, 1280).size).toBe(594);

    const landscape = centeredSquare(1600, 900);
    expect(landscape.x).toBeGreaterThan(0);
    expect(landscape.y).toBeGreaterThan(0);
    expect(resizeSquare(landscape, -10_000, 1600, 900).size).toBe(90);
  });
});
