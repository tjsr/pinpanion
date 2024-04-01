export interface InfoSize {
  heightPx: number,
  widthEm: number,
  bottomPaddingPixels?: number
}

export const PIN_INFO_PANE_SIZES = new Map<string, InfoSize>();

PIN_INFO_PANE_SIZES.set('tiny', { heightPx: 190, widthEm: 6 });
PIN_INFO_PANE_SIZES.set('sm', { heightPx: 231, widthEm: 8 });
PIN_INFO_PANE_SIZES.set('normal', { heightPx: 285, widthEm: 12 });
PIN_INFO_PANE_SIZES.set('large', { heightPx: 400, widthEm: 14 });

export const SET_INFO_PANE_SIZES = new Map<string, InfoSize>();

SET_INFO_PANE_SIZES.set('tiny', { bottomPaddingPixels: 4, heightPx: 164, widthEm: 7.5 });
SET_INFO_PANE_SIZES.set('sm', { bottomPaddingPixels: 4, heightPx: 204, widthEm: 9.6 });
SET_INFO_PANE_SIZES.set('normal', { bottomPaddingPixels: 4, heightPx: 284, widthEm: 14 });
SET_INFO_PANE_SIZES.set('large', { bottomPaddingPixels: 4, heightPx: 344, widthEm: 20 });

export const BUTTON_SIZES = new Map<string, number>();
BUTTON_SIZES.set('tiny', 32);
BUTTON_SIZES.set('sm', 32);
BUTTON_SIZES.set('normal', 48);
BUTTON_SIZES.set('large', 64);
