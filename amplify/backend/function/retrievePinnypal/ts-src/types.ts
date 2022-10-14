export type PinSelectionList = {
  name: string;
  id: string;
  availableIds: number[];
  wantedIds: number[];
  revision: number;
  editable: boolean;
  pinnypalsUser?: string;
};
