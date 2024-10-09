export class PinpanionDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PinpanionDataError';
  }
}
