import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { recruitsFromNotifications, recruitsFromRankingOverview, recruitsFromTrades } from './processRecruitSightings';
import { emptyRecruitBook, recordSighting, RecruitBook } from './recruitBook';

const book: RecruitBook = emptyRecruitBook();

// jest hoists these above the imports, so the module under test sees the mocks.
jest.mock('../elvenar/accountStore', () => ({
  listAccounts: () => [
    [
      '1@en3',
      {
        isDetached: false,
        cityQuery: { accountId: '1@en3', sessionId: 's', userData: { player_id: 1, guild_info: { id: 100 } } },
      },
    ],
  ],
}));
jest.mock('./recruitStore', () => ({
  withRecruitBook: <T>(_: string, change: (b: RecruitBook) => T) => Promise.resolve(change(book)),
}));

describe('recruitsFromNotifications', () => {
  it('counts help from a tracked candidate as activity, and leaves strangers out', async () => {
    recordSighting(book, { playerId: 42, name: 'Ginge', source: 'neighbour', at: 0, chapter: 14, guild: null }, {});
    const json = [
      {
        requestClass: 'NotificationService',
        requestMethod: 'getAllNotifications',
        responseData: [
          {
            __class__: 'NeighborlyHelpNotificationVO',
            id: 1,
            other_player: { player_id: 42, name: 'Ginge' },
            timestamp: 1_760_000_000,
          },
          {
            __class__: 'NeighborlyHelpNotificationVO',
            id: 2,
            other_player: { player_id: 77, name: 'Stranger' },
            timestamp: 1_760_000_100,
          },
        ],
      },
    ] as unknown as ElvenarRequestResponseEntry[];

    await recruitsFromNotifications(json, { sessionId: 's' } as ExtensionSharedInfo);

    expect(book.recruits['42'].activity).toEqual([{ at: 1_760_000_000_000, kind: 'help' }]);
    expect(book.recruits['77']).toBeUndefined();
  });
});

describe('recruitsFromTrades', () => {
  const trade = (id: number, playerId: number, guild?: { id: number; name: string }) => ({
    __class__: 'PlayerTradeVO',
    id,
    offer: { good_id: 'marble', value: 120 },
    need: { good_id: 'steel', value: 80 },
    trader: { player_id: playerId, name: `t${playerId}`, avatar: '', ...(guild ? { guild_info: guild } : {}) },
    expiresIn: 3600,
  });
  const market = (...trades: unknown[]) =>
    [
      { requestClass: 'TradeService', requestMethod: 'getOtherPlayersTrades', responseData: trades },
    ] as unknown as ElvenarRequestResponseEntry[];
  const sharedInfo = { sessionId: 's' } as ExtensionSharedInfo;

  it('takes guildless traders in, and counts each offer from a candidate once', async () => {
    await recruitsFromTrades(market(trade(1, 501), trade(2, 502, { id: 9, name: 'Others' })), sharedInfo);
    await recruitsFromTrades(market(trade(1, 501)), sharedInfo);

    expect(book.recruits['501']).toMatchObject({ sources: ['trade'], stage: 'new' });
    expect(book.recruits['501'].activity).toEqual([
      expect.objectContaining({ kind: 'tradeOffer', detail: '120 marble for 80 steel', ref: 'trade:1' }),
    ]);
    expect(book.recruits['502']).toBeUndefined();
  });
});

describe('recruitsFromRankingOverview', () => {
  const sharedInfo = { sessionId: 's' } as ExtensionSharedInfo;
  const answer = (responseData: unknown) =>
    [
      { requestClass: 'RankingService', requestMethod: 'getRankingOverview', responseData },
    ] as unknown as ElvenarRequestResponseEntry[];
  const request = { requestData: [42] } as unknown as ElvenarRequestResponseEntry;

  it('takes an empty answer as a player in no ranking, without stopping anything', async () => {
    delete book.scoreRefreshOff;
    await recruitsFromRankingOverview(answer([]), sharedInfo, request);
    expect(book.recruits['42'].unrankedAt).toBeDefined();
    expect(book.scoreRefreshOff).toBeUndefined();
  });

  it('closes a new candidate as gone', () => {
    expect(book.recruits['42'].stage).toBe('gone');
  });

  it('brings them back once a score comes back', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    await recruitsFromRankingOverview(answer([{ category: 'culture_demand', score: 1000 }]), sharedInfo, request);
    expect(book.recruits['42'].unrankedAt).toBeUndefined();
    expect(book.recruits['42'].stage).toBe('new');
  });

  it('still stops on an answer with no usable numbers', async () => {
    await recruitsFromRankingOverview(answer([{ category: 'culture_demand' }]), sharedInfo, request);
    expect(book.scoreRefreshOff?.reason).toMatch(/No scores in the answer/);
  });
});

describe('notifications that name a player who did nothing', () => {
  it('are not taken as activity', async () => {
    const before = book.recruits['42'].activity.length;
    const json = [
      {
        requestClass: 'NotificationService',
        requestMethod: 'getAllNotifications',
        responseData: [
          {
            __class__: 'GuildNotificationVO',
            id: 9,
            other_player: { player_id: 42, name: 'Ginge' },
            timestamp: 1_760_500_000,
          },
        ],
      },
    ] as unknown as ElvenarRequestResponseEntry[];
    await recruitsFromNotifications(json, { sessionId: 's' } as ExtensionSharedInfo);
    expect(book.recruits['42'].activity).toHaveLength(before);
  });
});
