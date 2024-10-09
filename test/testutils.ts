import { Pin } from '../src/types.js';
import { PinpanionDataError } from '../src/errors.js';

export const getPinFromTestData = (pins: Pin[], pinId: number): Pin|undefined => {
  return pins.find((pin) => pin.id === pinId);
};

export const findPinByName = (pins: Pin[], name: string): Pin|undefined => {
  return pins.find((pin) => pin.name === name);
};

export const findTestPin = (pins: Pin[], pinName: string, pinId: number): Pin => {
  const pin: Pin | undefined = findPinByName(pins, pinName);
  if (!pin) {
    throw new Error('Staff test pin not found');
  }
  if (pin.id !== pinId) {
    throw new PinpanionDataError('Light Blue Squid doees not have the expected Id of ID');
  }
  return pin;
};
