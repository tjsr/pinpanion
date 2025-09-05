import type { PinSelectionList } from '../types.ts';
import { encodePinSelectionHash } from './encodePinSelectionList.ts';

describe('encodePinSelectionHash', () => {
  test('Should create an encoded string from a PSL for offline mode', () => {
    const psl: PinSelectionList = {
      availableIds: [2, 4, 7, 13],
      availableSetIds: [2, 4, 7, 13],
      id: 'abc-123-xxx-xyz',
      name: 'A test list',
      ownerId: 'o123',
      revision: 2,
      wantedIds: [1, 5, 9, 14],
      wantedSetIds: [1, 5, 9, 14],
    };
    const output = encodePinSelectionHash(psl, true);

    // No large skip ranges here, so uncompressed encoded strings will be used.
    expect(output).toBe('id=abc-123-xxx-xyz&n=A+test+list&o=o123&r=2&a=BBK&w=CER&as=BBK&ws=CER');
  });

  test('Should create an encoded string from a PSL', () => {
    const psl: PinSelectionList = {
      availableIds: [2, 4, 7, 13],
      availableSetIds: [2, 4, 7, 13],
      id: 'abc-123-xxx-xyz',
      name: 'A test list',
      ownerId: 'o123',
      revision: 2,
      wantedIds: [1, 5, 9, 14],
      wantedSetIds: [1, 5, 9, 14],
    };
    const output = encodePinSelectionHash(psl);
    expect(output).toBe('id=abc-123-xxx-xyz&n=A+test+list&o=o123&r=2');
  });
});
