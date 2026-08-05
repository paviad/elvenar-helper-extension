import { SwapEntry } from '../../model/kpSwap';
import { groupSwapsByPayee } from './groupSwapsByPayee';

function entry(overrides: Partial<SwapEntry> = {}): SwapEntry {
  return {
    threadId: '1',
    subject: '10 KP SWAP',
    amount: 10,
    recipientName: 'Alice',
    recipientPlayerId: 200,
    recipientPost: 'Needles of the Tempest please',
    recipientPostedAt: 100,
    requestedWonder: 'Golden Abyss',
    myPostedAt: 200,
    ...overrides,
  };
}

describe('groupSwapsByPayee', () => {
  it('sums a payee across the threads they appear in', () => {
    const groups = groupSwapsByPayee([
      entry({ threadId: '1', amount: 10, myPostedAt: 100 }),
      entry({ threadId: '2', amount: 60, myPostedAt: 200 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Alice', playerId: 200, total: 70 });
    expect(groups[0].entries.map((e) => e.threadId)).toEqual(['2', '1']);
  });

  it('keeps different payees apart even when the name repeats', () => {
    const groups = groupSwapsByPayee([
      entry({ recipientPlayerId: 200, recipientName: 'Alice', amount: 10 }),
      entry({ recipientPlayerId: 300, recipientName: 'Alice', amount: 60 }),
    ]);

    expect(groups.map((g) => g.total).sort()).toEqual([10, 60]);
  });

  it('orders groups by their most recent round', () => {
    const groups = groupSwapsByPayee([
      entry({ recipientPlayerId: 200, recipientName: 'Alice', myPostedAt: 100 }),
      entry({ recipientPlayerId: 300, recipientName: 'Bob', myPostedAt: 400 }),
      entry({ recipientPlayerId: 200, recipientName: 'Alice', myPostedAt: 300 }),
    ]);

    expect(groups.map((g) => g.name)).toEqual(['Bob', 'Alice']);
  });

  it('keeps each thread separate, since the wonder asked for can differ', () => {
    const groups = groupSwapsByPayee([
      entry({ threadId: '1', recipientPost: 'Needles of the Tempest please', myPostedAt: 200 }),
      entry({ threadId: '2', recipientPost: 'Golden Abyss please', myPostedAt: 100 }),
    ]);

    expect(groups[0].entries.map((e) => e.recipientPost)).toEqual([
      'Needles of the Tempest please',
      'Golden Abyss please',
    ]);
  });

  it('returns nothing for no debts', () => {
    expect(groupSwapsByPayee([])).toEqual([]);
  });
});
