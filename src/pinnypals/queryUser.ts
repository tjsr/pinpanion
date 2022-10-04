import { PinSelectionList } from '../types';
import { PinnypalsUserCollectionQuery } from './types';
import { v5 as uuidv5 } from 'uuid';
export const PINNYPALS_NAMESPACE = '1c9f0a31-5f86-4fba-9244-c64b20813c55';

export const queryPinnypalsUser = async (endpoint: string, username: string): Promise<PinnypalsUserCollectionQuery> => {
  const postedFormData: URLSearchParams = new URLSearchParams();
  postedFormData.append('userid', username);
  postedFormData.append('type', 'username');

  const result: Promise<PinnypalsUserCollectionQuery> = await fetch(endpoint, {
    body: postedFormData,
    method: 'post',
  }).then((response: Response) => {
    return response.json();
  });
  return result;
};

export const createLanyardFromPinnypalsUserResult = (queryResult: PinnypalsUserCollectionQuery): PinSelectionList => {
  const lanyardId: string = uuidv5(queryResult.user.userid, PINNYPALS_NAMESPACE);
  const availableIds: number[] = [];
  const wantedIds: number[] = [];
  queryResult.pinsCollection.forEach((p) => {
    const numHave = parseInt(p.have);
    for (let i = 1;i <= numHave;i++) {
      wantedIds.push(parseInt(p.pin_id));
    }
    const numWant = parseInt(p.want);
    for (let i = 1;i <= numWant;i++) {
      availableIds.push(parseInt(p.pin_id));
    }
  });
  return {
    availableIds,
    editable: false,
    id: lanyardId,
    name: queryResult.user.username,
    pinnypalsUser: queryResult.user.username,
    revision: parseInt(queryResult.user.unix_time),
    wantedIds,
  };
};