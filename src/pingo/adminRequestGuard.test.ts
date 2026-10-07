import { beforeEach, describe, expect, it } from 'vitest';
import { adminRequestAvailability, recordPingoResponse,
  reserveAdminRequest, reservePingoPoll, reserveRolloverRequest } from './adminRequestGuard.ts';

beforeEach(() => window.localStorage.clear());

describe('caller request guard', () => {
  it('spaces calls per game across reads from browser storage', () => {
    expect(reserveAdminRequest('GAME-A', 1_000_000)).toEqual({ allowed: true });
    expect(adminRequestAvailability('GAME-A', 1_000_001)).toMatchObject({
      allowed: false, reason: 'spacing'
    });
    expect(reserveAdminRequest('GAME-A', 1_009_000)).toEqual({ allowed: true });
    expect(reserveAdminRequest('GAME-B', 1_009_000)).toEqual({ allowed: true });
  });

  it('keeps a five-minute circuit open after a service failure, including after a reload', () => {
    expect(reserveAdminRequest('GAME-A', 1_000_000)).toEqual({ allowed: true });
    recordPingoResponse(503, 1_000_100);
    expect(adminRequestAvailability('GAME-A', 1_009_000)).toMatchObject({
      allowed: false, reason: 'service'
    });
    expect(adminRequestAvailability('GAME-B', 1_300_099)).toMatchObject({
      allowed: false, reason: 'service'
    });
    expect(reserveAdminRequest('GAME-A', 1_300_100)).toEqual({ allowed: true });
  });

  it('counts verification and player polls against the same browser safety ceiling', () => {
    expect(reservePingoPoll('verify:GAME-A:BOARD-A', 15_000, 1_000_000)).toEqual({ allowed: true });
    expect(reservePingoPoll('verify:GAME-A:BOARD-A', 15_000, 1_010_000)).toMatchObject({
      allowed: false, reason: 'spacing'
    });
    expect(reservePingoPoll('verify:GAME-A:BOARD-A', 15_000, 1_015_000)).toEqual({ allowed: true });
    expect(reservePingoPoll('players:GAME-A', 10_000, 1_015_000)).toEqual({ allowed: true });
  });

  it('allows one rollover after an admin open while spacing repeated rollover attempts', () => {
    expect(reserveAdminRequest('GAME-A', 1_000_000)).toEqual({ allowed: true });
    expect(reserveRolloverRequest('GAME-A', 1_001_000)).toEqual({ allowed: true });
    expect(reserveRolloverRequest('GAME-A', 1_001_001)).toMatchObject({
      allowed: false, reason: 'spacing'
    });
  });

  it('stops the browser after 5,000 admin attempts in 24 hours', () => {
    for (let index = 0; index < 5_000; index += 1) {
      expect(reserveAdminRequest('GAME-A', 1_000_000 + index * 9_000)).toEqual({ allowed: true });
    }
    expect(adminRequestAvailability('GAME-A', 1_000_000 + 5_000 * 9_000))
      .toMatchObject({ allowed: false, reason: 'daily' });
    expect(reserveAdminRequest('GAME-A', 1_000_000 + 24 * 60 * 60_000)).toEqual({ allowed: true });
  });
});
