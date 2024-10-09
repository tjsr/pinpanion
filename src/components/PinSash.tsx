import { PAXId, Pin, PinGroup, PinGroupId, PinSet, PinSetId } from '../types.js';
import { getGroupCssClass, getPaxCssClass } from './PinInfo.js';

import eventnames from '../eventnames.json';

export const getGroupById = (groupId: PinGroupId, groups: PinGroup[]): PinGroup => {
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error(`Group with id ${groupId} not found.`);
  }
  return group;
};

interface PinSashPropTypes {
  pin: Pin;
  sets: PinSet[];
  groups: PinGroup[];
}

export const PinSash = ({ pin, sets, groups }: PinSashPropTypes): React.ReactNode => {
  if (pin.group_id) {
    return <PinGroupSash groups={groups} pinGroupId={pin.group_id} />;
  }

  const setId = pin.set_id || pin.sub_set_id;

  if (setId) {
    return <PinSetSash pinSetId={setId} paxId={pin.pax_id!} sets={sets} />;
  }

  const paxCssClass = 'pax ' + getPaxCssClass('pax', pin.pax_id!);

  const pinPaxEvent = eventnames[pin.pax_id!];
  if (!pinPaxEvent) {
    console.warn(`No event name known for PAX with Id ${pin.pax_id}`);
    return <div className={paxCssClass}>Unknown PAX event {pin.year}</div>;
  }

  return (<div className={paxCssClass}>{pinPaxEvent.description} {pin.year}</div>);
};

const PinGroupSash = ({ pinGroupId, groups } : { pinGroupId: PinGroupId, groups: PinGroup[] }) => {
  const group = getGroupById(pinGroupId, groups);
  const groupCssClass = 'group' + ' ' + getGroupCssClass(group);
  return <div>
    <div className={groupCssClass} data-pin-group-id={group.id}>{group.name}</div>
  </div>;
};

interface PinSetSashPropTypes {
  pinSetId: PinSetId;
  paxId: PAXId;
  sets: PinSet[];
}

const PinSetSash = ({ pinSetId, paxId, sets } : PinSetSashPropTypes) => {
  const pinSet: PinSet | undefined = sets?.find((set: PinSet) => set?.id == pinSetId);
  if (!pinSet) {
    return <></>;
  }

  const setCssClass = 'set ' + getPaxCssClass('pax', paxId);
  return <div>
    <div className={setCssClass} data-pin-set-id={pinSetId}>{pinSet.name}</div>
  </div>;
};
