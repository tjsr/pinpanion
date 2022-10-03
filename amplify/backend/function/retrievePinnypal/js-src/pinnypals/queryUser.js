import fetch from 'node-fetch';
import { v5 as uuidv5 } from 'uuid';

export const PINNYPALS_NAMESPACE = '1c9f0a31-5f86-4fba-9244-c64b20813c55';

export const queryPinnypalsUser = async (endpoint, username) => {
  const postedFormData = new URLSearchParams({
    type: 'username',
    userid: username,
  });

  console.log('Querying for user ' + username);

  const prCollection = new Promise((resolve, reject) => {
    console.log(`Fetching ${endpoint} with ${postedFormData}`, postedFormData);
    fetch(endpoint, {
      body: postedFormData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    })
      .then((response) => {
        console.log('Got response');
        return response.json();
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
  return prCollection;
};

export const createLanyardFromPinnypalsUserResult = (queryResult) => {
  const lanyardId = uuidv5(queryResult.user.userid, PINNYPALS_NAMESPACE);
  const availableIds = [];
  const wantedIds = [];
  queryResult.pinsCollection.forEach((p) => {
    const numHave = parseInt(p.have);
    for (let i = 1; i <= numHave; i++) {
      wantedIds.push(parseInt(p.pin_id));
    }
    const numWant = parseInt(p.want);
    for (let i = 1; i <= numWant; i++) {
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
