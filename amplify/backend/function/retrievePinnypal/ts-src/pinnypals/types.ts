type PPUserPin = {
  user_id: string,
  pin_id: string,
  have: string,
  want: string
};

type PinnypalsUser = {
  id: string,
  unix_time: string,
  username: string,
  userid: string,
};

export type PinnypalsUserCollectionQuery = {
  success: boolean,
  pinsCollection: PPUserPin[],
  user: PinnypalsUser,
};

