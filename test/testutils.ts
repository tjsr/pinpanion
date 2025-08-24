import { Pin } from '../src/types.ts';
import { PinpanionDataError } from '../src/errors.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const getPinFromTestData = (pins: Pin[], pinId: number): Pin | undefined => {
  return pins.find((pin) => pin.id === pinId);
};

export const findPinByName = (pins: Pin[], name: string): Pin | undefined => {
  return pins.find((pin) => pin.name === name);
};

export const findTestPin = (pins: Pin[], pinName: string, pinId: number): Pin => {
  const pin: Pin | undefined = findPinByName(pins, pinName);
  if (!pin) {
    throw new Error(`${pinName} pin not found`);
  }
  if (pin.id !== pinId) {
    throw new PinpanionDataError(`${pinName} has id of ${pin.id} not expected Id of ${pinId}`);
  }
  return pin;
};

export const isWindows = os.platform() === 'win32';

export const isBaseDirectory = (p: string): boolean => {
  const parsedPath = path.parse(p);
  return parsedPath.root === parsedPath.dir;
};

export const isTopDirectory = (path: string): boolean => {
  if (isWindows) {
    return isBaseDirectory(path);
  }
  return path === '/';
};

export const findFileUpwards = (
  searchFilename: string = 'package.json',
  maxDepth: number = 2,
  startDir: string = process.cwd()
): string => {
  let currentLevel = 0;
  let searchPath = startDir;
  do {
    const searchFilePath = path.resolve(searchPath, searchFilename);
    if (fs.existsSync(searchFilePath)) {
      return searchFilePath;
    }
    if (isTopDirectory(searchPath)) {
      break;
    }

    searchPath = path.resolve(searchPath, '..');
  } while (currentLevel++ < maxDepth);

  throw new Error(`Could not find ${searchFilename} ${maxDepth} levels below ${startDir}`);
};
