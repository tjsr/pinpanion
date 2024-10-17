import { PAX, PAXEvent, PAXEventId, Pin, PinGroup, PinGroupId, PinSet, PinSetId } from '../types.js';
import {
  getGroupCssClass,
  getPaxCssClassFromEventId,
  getPaxDisplayForEvent,
  getPaxDisplayForEventId
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
    console.warn(`No eventId on pin ${pin.id}`, pin);
    return <div className='pax'>Unknown PAX event {pin.year}</div>;
  }
};

export const PaxEventSash = (
  { eventId, event, events } : { eventId?: PAXEventId, event?: PAXEvent, events?: PAXEvent[] }
) => {
  if (!event && !eventId && !events) {
    throw new Error('Either event or events list with eventId must be provided');
  }

  let paxDisplay;
  try {
    if (event) {
      paxDisplay = getPaxDisplayForEvent(event);
    } else {
      paxDisplay = getPaxDisplayForEventId(eventId!, events!);
    }
    return <div
      className={'event ' + paxDisplay.cssClass}
      data-pin-event-id={eventId || event!.id}>{event?.name}</div>;
  } catch (err) {
    if (event) {
      console.warn(err, event);
    } else {
      console.warn(err, eventId);
    }
    return <div className='event'>Unknown PAX event {eventId || event!.id}</div>;
  }
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

  const setCssClass = 'set ' + getPaxCssClassFromEventId(paxEventId, events);
  return <div className={setCssClass} data-pin-set-id={pinSetId}>{pinSet.name}</div>;
};
