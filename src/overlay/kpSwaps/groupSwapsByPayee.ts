import { SwapEntry } from '../../model/kpSwap';

// You repay a person, not a thread. A fellow running several swap threads shows up once per
// thread you posted in, so the debts are grouped by payee: one visit to their wonders settles
// the lot. The per-thread rows stay inside the group because the wonder they asked for can
// differ between threads, and each thread carries its own amount.

export interface PayeeGroup {
  playerId: number;
  name: string;
  /** Total owed to this payee across their threads. */
  total: number;
  /** Their debts, newest round first. */
  entries: SwapEntry[];
}

/**
 * Groups debts by the player they are owed to. Groups come back in order of the most recent
 * round in each, so the list reads in the order you worked through the threads.
 */
export function groupSwapsByPayee(entries: SwapEntry[]): PayeeGroup[] {
  const groups = new Map<number, PayeeGroup>();

  for (const entry of entries) {
    const existing = groups.get(entry.recipientPlayerId);
    if (existing) {
      existing.total += entry.amount;
      existing.entries.push(entry);
    } else {
      groups.set(entry.recipientPlayerId, {
        playerId: entry.recipientPlayerId,
        name: entry.recipientName,
        total: entry.amount,
        entries: [entry],
      });
    }
  }

  const newestIn = (group: PayeeGroup) => Math.max(...group.entries.map((e) => e.myPostedAt));

  for (const group of groups.values()) {
    group.entries.sort((a, b) => b.myPostedAt - a.myPostedAt);
  }

  return [...groups.values()].sort((a, b) => newestIn(b) - newestIn(a) || a.name.localeCompare(b.name));
}
