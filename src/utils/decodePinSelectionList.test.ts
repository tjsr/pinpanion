import { PinSelectionList } from '../types';
import { decodePinSelectionHash } from './decodePinSelectionList';

describe('decodePinSelectionHash', () => {
  test('Should create an encoded tring from a PSL', () => {
    const output: PinSelectionList = decodePinSelectionHash('a=BBK&id=abc-123-xxx-xyz&n=A+test+list&r=2&w=CER');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.revision).toBe(2);
  });

  test('Should work when wanted arrays is missing', () => {
    const output: PinSelectionList = decodePinSelectionHash('a=BBK&id=abc-123-xxx-xyz&n=A+test+list&r=2');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedIds).toStrictEqual([]);
    expect(output.revision).toBe(2);
  });

  test('Should work when available arrays is missing', () => {
    const output: PinSelectionList = decodePinSelectionHash('id=abc-123-xxx-xyz&n=A+test+list&r=2&w=CER');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([]);
    expect(output.wantedIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.revision).toBe(2);
  });
});
