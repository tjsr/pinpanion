export interface InfoSize {
  heightPx: number,
  widthEm: number,
  bottomPaddingPixels?: number
}

export const PIN_INFO_PANE_SIZES = new Map<string, InfoSize>();

PIN_INFO_PANE_SIZES.set('tiny', { bottomPaddingPixels: 8, heightPx: 154, widthEm: 6 });
PIN_INFO_PANE_SIZES.set('sm', { bottomPaddingPixels: 8, heightPx: 200, widthEm: 8 });
PIN_INFO_PANE_SIZES.set('normal', { bottomPaddingPixels: 8, heightPx: 256, widthEm: 12 });
PIN_INFO_PANE_SIZES.set('large', { bottomPaddingPixels: 8, heightPx: 356, widthEm: 14 });

export const SET_INFO_PANE_SIZES = new Map<string, InfoSize>();

SET_INFO_PANE_SIZES.set('tiny', { bottomPaddingPixels: 4, heightPx: 164, widthEm: 7.5 });
SET_INFO_PANE_SIZES.set('sm', { bottomPaddingPixels: 4, heightPx: 204, widthEm: 9.6 });
SET_INFO_PANE_SIZES.set('normal', { bottomPaddingPixels: 4, heightPx: 280, widthEm: 14.5 });
SET_INFO_PANE_SIZES.set('large', { bottomPaddingPixels: 4, heightPx: 340, widthEm: 21 });

export const BUTTON_SIZES = new Map<string, number>();
BUTTON_SIZES.set('tiny', 32);
BUTTON_SIZES.set('sm', 48);
BUTTON_SIZES.set('normal', 64);
BUTTON_SIZES.set('large', 64);
