import { PAXEvent, PAXEventId, PAXId, Pin, PinGroup, PinGroupId, PinSet, PinSetId } from '../types.js';
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
  events: PAXEvent[];
}

export const PinSash = ({ pin, sets, groups, events }: PinSashPropTypes): React.ReactNode => {
  const group: PinGroup | undefined = groups.find((g) => g.id === pin.group_id);
  if (group) {
    return <PinGroupSash group={group} />;
  }

  const event: PAXEvent|undefined = events.find((e) => e.id === pin.pax_event_id);
  if (event) {
    return <PaxEventSash event={event} />;
  }

  if (pin.set_id) {
    return <PinSetSash pinSetId={pin.set_id} eventId={pin.pax_event_id!} sets={sets} />;
  }

  const paxCssClass = 'pax ' + getPaxCssClass('pax', pin.pax_id!);

  const pinPaxEvent = eventnames[pin.pax_id!];
  if (!pinPaxEvent) {
    console.warn(`No event name known for PAX with Id ${pin.pax_id}`, pin);
    return <div className={paxCssClass}>Unknown PAX event {pin.year}</div>;
  }

  return (<div className={paxCssClass}>{pinPaxEvent.description} {pin.year}</div>);
};

const PaxEventSash = ({ event } : { event: PAXEvent }) => {
  const eventCssClass = 'event ' + getEventCssClass(event);
  return <div className={eventCssClass} data-pin-event-id={event.id}>{event.name}</div>
  event.
};

const PinGroupSash = ({ group } : { group: PinGroup }) => {
  const groupCssClass = 'group  ' + getGroupCssClass(group);
  return <div className={groupCssClass} data-pin-group-id={group.id}>{group.name}</div>;
};

interface PinSetSashPropTypes {
  pinSetId: PinSetId;
  paxEventId: PAXEventId;
  sets: PinSet[];
}

const PinSetSash = ({ pinSetId, paxEventId, sets } : PinSetSashPropTypes) => {
  const pinSet: PinSet | undefined = sets?.find((set: PinSet) => set?.id == pinSetId);
  if (!pinSet) {
    return <></>;
  }

  const setCssClass = 'set ' + getPaxCssClass('pax', paxId);
  return <div>
    <div className={setCssClass} data-pin-set-id={pinSetId}>{pinSet.name}</div>
  </div>;
};
