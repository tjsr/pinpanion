import { PAX, PAXEvent, PAXEventId, Pin, PinGroup, PinGroupId, PinSet, PinSetId } from '../types.js';
import {
  convertEventSubtypeToCssName,
  getCssNameForEventId,
  getGroupCssClass
} from '../css/cssClasses.js';

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
  paxs: PAX[];
  events: PAXEvent[];
}


// type ModelObject = {
//   itModelObject: boolean;
// };

// type TO = {
//   isTransferObject: boolean;
// };

// type ToOrModel = TO | ModelObject;

// type AsTO<T> = T & TO & ModelObject & { isTransferObject: true, isModelObject: false };
// type AsModel<TO extends TransferObject> = TO & ModelObject
// & ModelObject & { isTransferObject: true, isModelObject: false };

export const PinSash = ({ pin, sets, groups, events }: PinSashPropTypes): React.ReactNode => {
  const group: PinGroup | undefined = groups.find((g) => g.id === pin.groupId);
  if (group) {
    return <PinGroupSash group={group} />;
  }

  if (pin.setId) {
    return <PinSetSash pinSetId={pin.setId} paxEventId={pin.paxEventId!} sets={sets} events={events} />;
  }

  const event: PAXEvent|undefined = events.find((e) => e.id === pin.paxEventId);
  if (event) {
    return <PaxEventSash event={event} events={events} />;
  }

  if (pin.paxEventId) {
    return <PaxEventSash eventId={pin.paxEventId} events={events} />;
  } else {
    return <div className='pax'>Unknown PAX event {pin.year}</div>;
  }
};

export const PaxEventSash = (
  { eventId, event, events } : { eventId?: PAXEventId, event?: PAXEvent, events?: PAXEvent[] }
) => {
  if (!event && !eventId && !events) {
    throw new Error('Either event or events list with eventId must be provided');
  }

  const paxEvent = event || events?.find((e) => e.id === eventId);
  if (!paxEvent) {
    throw new Error(`No PAX event found for ${eventId}`);
    // return <div className='event'>Unknown PAX event {eventId || event!.id}</div>;
  }
  const cssName = convertEventSubtypeToCssName(paxEvent.subType);
  return <div
    className={'event ' + cssName}
    data-pin-event-id={paxEvent.id}>{paxEvent.name}</div>;
};

const PinGroupSash = ({ group } : { group: PinGroup }) => {
  const groupCssClass = 'group  ' + getGroupCssClass(group);
  return <div className={groupCssClass} data-pin-group-id={group.id}>{group.name}</div>;
};

interface PinSetSashPropTypes {
  pinSetId: PinSetId;
  paxEventId: PAXEventId;
  sets: PinSet[];
  events: PAXEvent[];
}

const PinSetSash = ({ pinSetId, paxEventId, sets, events } : PinSetSashPropTypes) => {
  const pinSet: PinSet | undefined = sets?.find((set: PinSet) => set?.id == pinSetId);
  if (!pinSet) {
    return <></>;
  }

  if (!paxEventId) {
    return <div className='set' data-pin-set-id={pinSetId}>{pinSet.name}</div>;
  }

  const setCssClass = 'set ' + getCssNameForEventId(paxEventId, events);
  return <div className={setCssClass} data-pin-set-id={pinSetId}>{pinSet.name}</div>;
};
