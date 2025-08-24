import type { Pinnypals3ItemDataEvent, Pinnypals3ItemDataPin } from './pinnypals3types.ts';

export class PinnypalsDataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class PinnypalsPinDataError extends PinnypalsDataError {
  _inputPin: Pinnypals3ItemDataPin;
  constructor(message: string, inputPin: Pinnypals3ItemDataPin) {
    super(message);
    this._inputPin = inputPin;
  }
}

export class PinnypalsEventSubtypeError extends PinnypalsDataError {
  _inputEvent: Pinnypals3ItemDataEvent;
  _subtype: string;
  constructor(subtype: string, inputEvent: Pinnypals3ItemDataEvent) {
    super('Invalid event subtype: ' + subtype);
    this._inputEvent = inputEvent;
    this._subtype = subtype;
  }
}
