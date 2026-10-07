import { callerSigningKey, drawBatchKeys, drawIdsFromBatchKeys, signPinCount,
  verifiedGameStart } from './secure.ts';

export async function testAdminResponse(game: string, pin: number, at: number, poolSize: number,
  pinIds: number[], secret = 'test-signing-secret') {
  const startMs = verifiedGameStart(game)!;
  const drawKeys = await drawBatchKeys(secret, startMs, poolSize);
  const ids = await drawIdsFromBatchKeys(drawKeys, pinIds.slice(0, poolSize), Math.min(poolSize, 100));
  const signingKey = await callerSigningKey(secret, game);
  const sig = await signPinCount(secret, game, pin, at);
  return { at, drawKeys, game, ids, pin, poolSize, sig, signingKey, startMs };
}
