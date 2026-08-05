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
  entries: SwapEntry[];
  skipped: SkippedSwapThread[];
}

/** Identifies a ticked-off row. Includes your post time, so a new round supersedes the tick. */
export function swapPaidKey(entry: Pick<SwapEntry, 'threadId' | 'myPostedAt'>): string {
  return `${entry.threadId}:${entry.myPostedAt}`;
}
