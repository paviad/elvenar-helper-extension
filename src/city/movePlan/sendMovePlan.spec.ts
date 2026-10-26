import { AccountData } from '../../elvenar/Accounts';
import { getAccountById, listAccounts } from '../../elvenar/accountStore';
import { clearStorage } from '../../testing/fakeStorage';
import { getMoveTarget, saveMoveTarget } from './moveTargetStore';
import { tileKey } from './rulesSimulator';
import { describeSendResult, playedAccountFor } from './sendMovePlan';

jest.mock('../../elvenar/accountStore', () => ({
  getAccountById: jest.fn(),
  listAccounts: jest.fn(),
  loadAccount: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('../../chrome/storage', () => require('../../testing/fakeStorage').storageModule);

const account = (playerId: number, isDetached: boolean) =>
  ({ isDetached, cityQuery: { userData: { player_id: playerId } } }) as unknown as AccountData;

describe('playedAccountFor', () => {
  const accounts: [string, AccountData][] = [
    ['848933052@en3', account(848933052, false)],
    ['City 2', account(848933052, true)],
    ['Neighbour', account(111, true)],
  ];
  beforeEach(() => {
    jest.mocked(listAccounts).mockReturnValue(accounts);
    jest.mocked(getAccountById).mockImplementation((id) => accounts.find(([key]) => key === id)?.[1]);
  });

  it('is the account itself for the city being played', () => {
    expect(playedAccountFor('848933052@en3')).toBe('848933052@en3');
  });

  it('is the account a saved layout was copied from', () => {
    expect(playedAccountFor('City 2')).toBe('848933052@en3');
  });

  it('is none for a visited player’s city', () => {
    expect(playedAccountFor('Neighbour')).toBeUndefined();
  });
});

describe('describeSendResult', () => {
  it('says how many steps the plan has, and what it cannot do', () => {
    expect(describeSendResult({ sent: true, steps: 12, unresolved: [] })).toBe(
      'Move plan sent to the helper in the game: 12 steps.',
    );
    expect(describeSendResult({ sent: true, steps: 1, unresolved: [{ reason: 'no-room', ids: [5] }] })).toBe(
      'Move plan sent to the helper in the game: 1 step. One thing it cannot do is listed there.',
    );
  });

  it('says so when the city already matches', () => {
    expect(describeSendResult({ sent: true, steps: 0, unresolved: [] })).toBe('Your city already matches this layout.');
  });

  it('says why nothing was sent', () => {
    expect(describeSendResult({ sent: false, why: 'not-your-city' })).toMatch(/your own cities/);
  });
});

describe('the stored target', () => {
  beforeEach(clearStorage);

  it('comes back as it was sent, streets and all', async () => {
    const target = {
      buildings: [
        {
          kind: 'R_Humans_Residential',
          level: 16,
          x: 30,
          y: 30,
          width: 5,
          length: 2,
          connection: 'mainHall' as const,
          reportedConnected: false,
        },
      ],
      streets: new Map([[tileKey(4, 7), 'S_Humans_Trail']]),
    };

    await saveMoveTarget('848933052@en3', 'City 2', target);
    const stored = await getMoveTarget('848933052@en3');

    expect(stored).toMatchObject({ from: 'City 2', target });
    expect(stored?.target.streets.get('4,7')).toBe('S_Humans_Trail');
  });

  it('is nothing for an account that was never sent one', async () => {
    expect(await getMoveTarget('848933052@en3')).toBeUndefined();
  });
});
