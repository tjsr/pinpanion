import { queryPinnypalsUser } from './queryUser';

describe('queryPinnypalsUser', () => {
  const PINNYPALS_QUERY_USER = 'https://pinnypals.com/scripts/queryUserCollection.php';

  test('Should retrieve for user', async () => {
    const userData = await queryPinnypalsUser(PINNYPALS_QUERY_USER, 'tjsr');
    expect(userData).not.toBeUndefined();
    expect(userData.success).toEqual(true);
    console.log(userData);
  });
});
