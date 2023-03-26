import { PinSelectionList } from '../types';
import { encodePinSelectionHash } from './encodePinSelectionList';

describe('encodePinSelectionHash', () => {
  test('Should create an encoded string from a PSL for offline mode', () => {
    const psl: PinSelectionList = {
      availableIds: [2, 4, 7, 13],
      editable: true,
      id: 'abc-123-xxx-xyz',
      name: 'A test list',
      revision: 2,
      wantedIds: [1, 5, 9, 14],
    };
    const output = encodePinSelectionHash(psl, true);
    expect(output).toBe('a=BBK&w=CER&id=abc-123-xxx-xyz&n=A+test+list&r=2');
  });

  test('Should create an encoded tring from a PSL', () => {
    const psl: PinSelectionList = {
      availableIds: [2, 4, 7, 13],
      editable: true,
      id: 'abc-123-xxx-xyz',
      name: 'A test list',
      revision: 2,
      wantedIds: [1, 5, 9, 14],
    };
    const output = encodePinSelectionHash(psl);
    expect(output).toBe('id=abc-123-xxx-xyz&n=A+test+list&r=2');
  });
});
