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

/**
 * A request of yours nobody has answered yet — knowledge owed to you that has not arrived.
 *
 * The chain gives to whoever posted last, so a request is unpaid exactly while it is still the
 * last post in its thread: the moment somebody posts after you, they have paid you and the
 * wonder's invested total has risen by this much. That makes these watermark-independent —
 * clearing the tally settles what you owe, and says nothing about what is owed to you.
 */
export interface PendingRequest {
  threadId: string;
  /** The wonder you asked for, canonicalised to the game's spelling. */
  requestedWonder: string;
  amount: number;
}

/** How many posts make a swap thread worth retiring, until you choose otherwise. */
export const DEFAULT_FULL_THREAD_POSTS = 100;
const MIN_FULL_THREAD_POSTS = 100;
const MAX_FULL_THREAD_POSTS = 1000;

/**
 * A post count typed into the setting, as a whole number within bounds, or undefined for
 * something that is not a number at all. A thread is not worth retiring before a hundred
 * posts, so the setting only ever raises the bar; the top is only there to keep a slip of the
 * keyboard from switching the list off for good.
 */
export function clampFullThreadPosts(value: string | number): number | undefined {
  const n = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(n) || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }
  return Math.min(MAX_FULL_THREAD_POSTS, Math.max(MIN_FULL_THREAD_POSTS, Math.round(n)));
}

/**
 * A swap thread of yours that has grown long enough to retire. The usual way is a notice in it
 * and a fresh thread under the same title — see `computeSwapTally` for how that is recognised.
 */
export interface FullThread {
  threadId: string;
  subject: string;
  posts: number;
}

export interface SwapTally {
  /** Debts from rounds you posted after the watermark. */
  entries: SwapEntry[];
  /** Requests still awaiting payment, whatever the watermark. */
  pendingRequests: PendingRequest[];
  skipped: SkippedSwapThread[];
  /** Swap threads long enough to retire and not yet replaced, longest first. */
  fullThreads: FullThread[];
  /**
   * Newest request post of yours across every thread, ignoring the watermark. Clearing the
   * list moves the watermark here, which is what retires the rounds currently shown. Taken
   * from the game's own timestamps rather than the local clock, so server skew cannot
   * suppress a genuinely new post. 0 when you have no request posts at all.
   */
  latestRequestAt: number;
}

/**
 * A wonder you have copied a request for, and so want the room-left figure kept in front of
 * you while you work through the threads.
 *
 * Only the identity is held. The figure itself is derived from the game's count and the
 * requests still outstanding, so there is nothing here to fall out of step with either.
 */
export interface WatchedWonder {
  baseName: string;
  /** Matched against posts, which name the wonder rather than its base name. */
  wonderName: string;
}

/** Identifies a ticked-off row. Includes your post time, so a new round supersedes the tick. */
export function swapPaidKey(entry: Pick<SwapEntry, 'threadId' | 'myPostedAt'>): string {
  return `${entry.threadId}:${entry.myPostedAt}`;
}
