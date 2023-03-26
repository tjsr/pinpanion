import { PinSelectionList } from '../types';
import { encodePinSelectionHash } from './encodePinSelectionList';

describe('encodePinSelectionHash', () => {
  test('Should create an encoded tring from a PSL', () => {
    const psl: PinSelectionList = {
      availableIds: [2, 4, 7, 13],
      editable: true,
      id: 'abc-123-xxx-xyz',
      name: 'A test list',
      revision: 2,
      wantedIds: [1, 5, 9, 14],
    };
    const output =encodePinSelectionHash(psl);
    expect(output).toBe('a=BBK&id=abc-123-xxx-xyz&n=A+test+list&r=2&w=CER');
  });
});
