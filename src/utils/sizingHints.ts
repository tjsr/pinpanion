export interface InfoSize {
  heightPx: number,
  widthEm: number,
}

export const PIN_INFO_PANE_SIZES = new Map<string, InfoSize>();

PIN_INFO_PANE_SIZES.set('tiny', { heightPx: 190, widthEm: 6 });
PIN_INFO_PANE_SIZES.set('sm', { heightPx: 231, widthEm: 8 });
PIN_INFO_PANE_SIZES.set('normal', { heightPx: 285, widthEm: 12 });
PIN_INFO_PANE_SIZES.set('large', { heightPx: 400, widthEm: 14 });
