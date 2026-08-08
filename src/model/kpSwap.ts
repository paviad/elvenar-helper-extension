// Knowledge-point swap threads.
//
// A swap thread is a chain: you give KP to whoever posted last, then post the wonder you want
// next, making yourself the new "last poster" for the person after you. The thread is a
// history — only the current round matters — so the tally is a short-lived worklist of who
// you owe right now, not a ledger. It is derived from the stored messages on every render;
// nothing about it is persisted except which rows you have ticked off.
//
// The trigger is your own post, because that is the one thing you control: a post reading
// exactly "<ancient wonder> please". Combined with an amount in the thread subject, that pair
// identifies a swap post with certainty.
//
// That alone is not enough to know whether a debt is still owed: you post in every round, so
// your most recent post in a thread is a request whether you settled it days ago or a minute
// ago. A watermark separates the two. Only posts of yours newer than it count, and clearing
// the list moves it forward past everything currently shown.

export interface SwapEntry {
  threadId: string;
  /** Thread subject, shown so you can tell the 60 KP thread from the 10 KP one. */
  subject: string;
  /** KP owed, parsed from the subject. */
  amount: number;
  /** Who you owe: the most recent poster before your post. */
  recipientName: string;
  recipientPlayerId: number;
  /** Their post, verbatim — it names the wonder they want. */
  recipientPost: string;
  recipientPostedAt: number;
  /** The wonder you asked for, canonicalised to the game's spelling. */
  requestedWonder: string;
  /** created_at of your post. Part of the paid key, so ticking self-expires next round. */
  myPostedAt: number;
}

/** A thread that gated on your post but whose subject yielded no usable amount. */
export interface SkippedSwapThread {
  threadId: string;
  subject: string;
  recipientName: string;
  /** Set when the subject named more than one distinct amount. */
  ambiguous: boolean;
}

export interface SwapTally {
  /** Debts from rounds you posted after the watermark. */
  entries: SwapEntry[];
  skipped: SkippedSwapThread[];
  /**
   * Newest request post of yours across every thread, ignoring the watermark. Clearing the
   * list moves the watermark here, which is what retires the rounds currently shown. Taken
   * from the game's own timestamps rather than the local clock, so server skew cannot
   * suppress a genuinely new post. 0 when you have no request posts at all.
   */
  latestRequestAt: number;
}

/**
 * How much knowledge a wonder you are asking for can still take.
 *
 * Seeded from the game's own figure the moment you copy a request, then counted down by each
 * request you post afterwards. It is counted down rather than recomputed because a request is
 * a pledge: the knowledge is owed to you but has not landed, so the game still reports the
 * wonder as needing it. Recomputing would invite you to ask for the same knowledge twice, and
 * a wonder that overflows leaves the giver's points wasted.
 */
export interface SwapBudget {
  /** Keyed by base name, but matched against posts by `wonderName` — that is what you type. */
  baseName: string;
  wonderName: string;
  remaining: number;
  /**
   * The newest request post already deducted, in game time. Requests are consumed once and
   * only once, so clearing the tally afterwards cannot resurrect knowledge you already asked
   * for.
   */
  countedThrough: number;
}

/** Identifies a ticked-off row. Includes your post time, so a new round supersedes the tick. */
export function swapPaidKey(entry: Pick<SwapEntry, 'threadId' | 'myPostedAt'>): string {
  return `${entry.threadId}:${entry.myPostedAt}`;
}
