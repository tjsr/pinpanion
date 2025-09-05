import { extractCompressedBitstring, stringToNumberArray } from 'sparse-bit-string';

import type { PinSelectionList } from '../types.ts';
import { decodePinSelectionHash } from './decodePinSelectionList.ts';

describe('decodePinSelectionHash', () => {
  test('Should create an encoded string from a PSL', () => {
    const output: PinSelectionList = decodePinSelectionHash(
      'id=abc-123-xxx-xyz&o=o123&n=A+test+list&r=2&A=ANABBK&W=AOACER');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.availableSetIds).toStrictEqual([]);
    expect(output.wantedSetIds).toStrictEqual([]);
    expect(output.revision).toBe(2);
  });

  test('Should decode available and wanted sets from an encoded PSL hash', () => {
    const output: PinSelectionList = decodePinSelectionHash(
      'id=abc-123-xxx-xyz&o=o123&n=A+test+list&r=2&A=ANABBK&W=AOACER&AS=ANABBK&WS=AOACER');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.availableSetIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedSetIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.revision).toBe(2);
  });

  test('Should work when wanted arrays is missing', () => {
    const output: PinSelectionList = decodePinSelectionHash(
      'A=ANABBK&id=abc-123-xxx-xyz&o=o123&n=A+test+list&r=2');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([2, 4, 7, 13]);
    expect(output.wantedIds).toStrictEqual([]);
    expect(output.revision).toBe(2);
  });

  test('Should work when available arrays is missing', () => {
    const output: PinSelectionList = decodePinSelectionHash(
      'id=abc-123-xxx-xyz&o=o123&n=A+test+list&r=2&W=AOACER');
    expect(output.name).toBe('A test list');
    expect(output.id).toBe('abc-123-xxx-xyz');
    expect(output.availableIds).toStrictEqual([]);
    expect(output.wantedIds).toStrictEqual([1, 5, 9, 14]);
    expect(output.revision).toBe(2);
  });

  test('Decodes compressed string as expected value', () => {
    const compressedValues: number[] = extractCompressedBitstring('ANABBK');
    expect(compressedValues).toStrictEqual([2, 4, 7, 13]);
  });

  test('Decodes uncompressed string as expected value', () => {
    const uncompressedValues: number[] = stringToNumberArray('BBK');
    expect(uncompressedValues).toStrictEqual([2, 4, 7, 13]);
  });

  test('Should extract a real number array', () => {
    const output: number[] = stringToNumberArray('4CgQf-DFDQgifnLYDIVWCimTA');
    expect(output).toStrictEqual([7, 8, 11, 14, 15, 18, 20, 24, 26, 32, 33, 35, 37, 39, 41, 46, 49, 50,
      58, 59, 61, 62, 64, 67, 68, 69, 72, 73, 74, 75, 76, 77, 80, 84, 90, 95, 97, 98, 103, 105, 109, 110,
      115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 131, 138, 140, 148, 149, 150]);
  });
});
