import { PAXEvent, PAXEventDisplayTypes, PAXEventId, PAXId, PinGroup } from '../types.js';

import eventDisplayTypes from '../static/eventDisplayTypes.json';
import { toProperCase } from '../utils.js';

type CSSClassName = string|undefined;

const displayTypes: PAXEventDisplayTypes[] = eventDisplayTypes as PAXEventDisplayTypes[];

export const getPaxDisplayForPaxId = (paxId: PAXId): PAXEventDisplayTypes => {
  const paxDisplay = eventDisplayTypes.find((p) => p.id === paxId);
  if (!paxDisplay) {
    throw new Error(`No PAX display info found for PAX ${paxId}`);
  }
  return paxDisplay;
};

export const getPaxDisplayForEventId = (paxEventId: PAXEventId, events: PAXEvent[]): PAXEventDisplayTypes => {
  const paxEvent = events.find((e) => e.id === paxEventId);
  if (!paxEvent) {
    throw new Error(`No PAX found for EventId ${paxEventId}`);
  }

  return getPaxDisplayForPaxId(paxEvent.paxId);
};

export const getPaxDisplayForEvent = (event: PAXEvent): PAXEventDisplayTypes => {
  return getPaxDisplayForPaxId(event.paxId);
};

export const getPaxNameFromEventId = (paxEventId: PAXEventId, events: PAXEvent[]): string => {
  const paxDisplay = getPaxDisplayForEventId(paxEventId, events);
  return paxDisplay.description;
};

export const getPaxCssClassFromEventId = (paxEventId: PAXEventId, events: PAXEvent[]): CSSClassName => {
  const paxDisplay = getPaxDisplayForEventId(paxEventId, events);
  return paxDisplay.cssClass;
};


const getPaxCssClassName = (paxId: PAXId): CSSClassName => {
  const event = displayTypes.find((p) => p.id === paxId);
  if (!event) {
    throw new Error(`No event name known for PAX with Id ${paxId}`);
  }
  return event.cssClass;
};

export const getGroupCssClass = (group: PinGroup): string => toProperCase(group.type || 'OTHER');

export const getPaxCssClass = (prefix: string, paxId: PAXId): string|undefined => {
  return prefix + getPaxCssClassName(paxId);
};
