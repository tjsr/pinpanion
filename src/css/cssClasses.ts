import { PAXEvent, PAXEventDisplayTypes, PAXEventId, PAXId, PinCategory, PinCategoryId, PinGroup } from '../types.ts';

import { Pinnypals3EventSubtypes } from '../pinnypals/pinnypals3types.ts';
import { PinnypalsDataError } from '../pinnypals/pinnypalsDataErrors.ts';
import eventDisplayTypes from '../static/eventDisplayTypes.json';
import { toProperCase } from '../utils.js';

type CSSClassName = string | undefined;

const displayTypes: PAXEventDisplayTypes[] = eventDisplayTypes as PAXEventDisplayTypes[];

export const convertEventSubtypeToCssName = (subtype: Pinnypals3EventSubtypes): string => {
  const event = subtype.split('_')[1];
  if (!event) {
    throw new PinnypalsDataError(`Subtype must follow the format PAX_XYZ but was ${subtype}`);
  }
  const cssName = toProperCase(event);
  return 'pax' + cssName;
};

export const getCssNameForEventId = (eventId: PAXEventId, events: PAXEvent[]): string => {
  const paxEvent = events.find((e) => e.id === eventId);
  if (!paxEvent) {
    throw new Error(`No PAX found for EventId ${eventId}`);
  }
  if (!paxEvent.subType) {
    throw new Error(`PAX event ${JSON.stringify(paxEvent)} has no subtype`);
  }

  return convertEventSubtypeToCssName(paxEvent.subType);
};

// export const getPaxDisplayForEventId = (paxEventId: PAXEventId, events: PAXEvent[]): PAXEventDisplayTypes => {
//   const paxEvent = events.find((e) => e.id === paxEventId);
//   if (!paxEvent) {
//     throw new Error(`No PAX found for EventId ${paxEventId}`);
//   }
//   return getPaxDisplayForPaxId(paxEvent.paxId);
// };

// export const getPaxDisplayForEvent = (event: PAXEvent): PAXEventDisplayTypes => {
//   return getPaxDisplayForPaxId(event.paxId);
// };

// export const getPaxNameFromEventId = (paxEventId: PAXEventId, events: PAXEvent[]): string => {
//   const paxDisplay = getPaxDisplayForEventId(paxEventId, events);
//   return paxDisplay.description;
// };

// export const getPaxCssClassFromEventId = (paxEventId: PAXEventId, events: PAXEvent[]): CSSClassName => {
//   const paxDisplay = getPaxDisplayForEventId(paxEventId, events);
//   return paxDisplay.cssClass;
// };

const getPaxCssClassName = (paxId: PAXId): CSSClassName => {
  const event = displayTypes.find((p) => p.id === paxId);
  if (!event) {
    throw new Error(`No event name known for PAX with Id ${paxId}`);
  }
  return event.cssClass;
};

export const getGroupCssClass = (group: PinGroup): string => toProperCase(group.type || 'OTHER');

export const getPaxCssClass = (prefix: string, paxId: PAXId): string | undefined => {
  return prefix + getPaxCssClassName(paxId);
};

export const getCategoryCssClass = (category: PinCategory): string =>
  'category' + toProperCase(category.name || 'OTHER');

export const getCategoryIdCssClass = (categoryId: PinCategoryId, categories: PinCategory[]): string => {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    throw new Error(`No category found for ${categoryId}`);
  }
  return getCategoryCssClass(category);
};
