import { GameMessage, MessagePostVO, MessagesData } from '../../model/gameMessage';
import {
  DEFAULT_FULL_THREAD_POSTS,
  FullThread,
  PendingRequest,
  SkippedSwapThread,
  SwapEntry,
  SwapTally,
} from '../../model/kpSwap';
import { parseSwapAmount } from './parseSwapAmount';

const EMPTY: SwapTally = { entries: [], pendingRequests: [], skipped: [], fullThreads: [], latestRequestAt: 0 };

// Game posts use bare "\r" for line breaks, so normalise before comparing.
function normalize(text: string | undefined): string {
  return (text ?? '').replace(/\r\n?/g, '\n').trim();
}

/**
 * Chronological order. created_at is only second-resolution, so two posts in the same second
 * are ordered by post_id; failing that the game's own array order stands (sort is stable).
 */
function chronological(posts: MessagePostVO[]): MessagePostVO[] {
  return [...posts].sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return a.created_at - b.created_at;
    }
    if (a.post_id !== undefined && b.post_id !== undefined) {
      return a.post_id - b.post_id;
    }
    return 0;
  });
}

interface StoredThread {
  id: string;
  message: GameMessage;
  /**
   * When the folder overview last saw this thread change, which is refreshed far more often
   * than the thread itself. Zero when no overview mentions it.
   */
  overviewAt: number;
}

/**
 * One copy of each thread. A thread can sit in both folders; keep whichever copy holds more
 * posts, since a thread we only know from an overview may have been stored with fewer. The
 * overview timestamp is taken as the newest either folder reports, since both describe the
 * same thread and the fresher one is the one that knows about the latest post.
 */
function dedupeThreads(messagesData: MessagesData | undefined): StoredThread[] {
  const best = new Map<string, GameMessage>();
  const overviewAt = new Map<string, number>();

  for (const folder of Object.values(messagesData ?? {})) {
    for (const [id, ts] of Object.entries(folder?.overview ?? {})) {
      overviewAt.set(id, Math.max(overviewAt.get(id) ?? 0, ts ?? 0));
    }
    for (const [id, message] of Object.entries(folder?.messages ?? {})) {
      const existing = best.get(id);
      if (!existing || (message.posts?.length ?? 0) > (existing.posts?.length ?? 0)) {
        best.set(id, message);
      }
    }
  }

  return [...best.entries()].map(([id, message]) => ({ id, message, overviewAt: overviewAt.get(id) ?? 0 }));
}

/**
 * How far apart the last post in a thread and the opening of its replacement may be. Replacing
 * a thread is one sitting's work — a notice in the old one, a new one with the same title — so
 * this is generous without reaching back to a replacement from another day.
 */
const REPLACEMENT_WINDOW = 30 * 60;

const subjectKey = (subject: string | undefined) => normalize(subject).toLowerCase().replace(/\s+/g, ' ');

interface Opening {
  threadId: string;
  at: number;
  wonder: string;
}

/**
 * Threads you started with a request as their first post, by subject. A full swap thread is
 * retired by posting a notice in it and starting a fresh one under the same title, and these
 * are the fresh ones.
 */
function openingsBySubject(
  threads: { id: string; message: GameMessage; posts: MessagePostVO[] }[],
  triggers: Map<string, string>,
  myPlayerId: number,
): Map<string, Opening[]> {
  const openings = new Map<string, Opening[]>();
  for (const { id, message, posts } of threads) {
    const first = posts[0];
    const wonder =
      first?.author?.player_id === myPlayerId ? triggers.get(normalize(first.post).toLowerCase()) : undefined;
    if (!wonder) {
      continue;
    }
    const key = subjectKey(message.subject);
    openings.set(key, [...(openings.get(key) ?? []), { threadId: id, at: first.created_at, wonder }]);
  }
  return openings;
}

/** Lowercased "<wonder> please" -> the wonder's canonical spelling. */
function buildTriggers(wonderNames: string[]): Map<string, string> {
  const triggers = new Map<string, string>();
  for (const name of wonderNames) {
    const trimmed = name.trim();
    if (trimmed) {
      triggers.set(`${trimmed} please`.toLowerCase(), trimmed);
    }
  }
  return triggers;
}

/**
 * Derives the current round of KP debts from the stored message threads.
 *
 * Per thread we look at your most recent post. If it reads exactly "<ancient wonder> please"
 * the thread is a swap thread and you owe the poster before you. "Before you" skips over any
 * run of consecutive posts of your own — that run is you changing your mind about which
 * wonder you want, which costs nothing extra. Once somebody else has posted in between it is
 * a new round, and they are the one you paid.
 *
 * `since` is the watermark: a request post at or before it belongs to a round you have
 * already dealt with, so it produces nothing. Without it the list would open full of every
 * thread you have ever swapped in, since the chain has you posting a request every round.
 *
 * Nothing about the debts is stored — they are re-derived from the threads on every call.
 *
 * The debts survive a thread going stale, since what you owe somebody stays owed whatever is
 * posted afterwards. What is owed to you does not: see `pendingRequests`.
 */
export function computeSwapTally(
  messagesData: MessagesData | undefined,
  wonderNames: string[],
  myPlayerId: number | undefined,
  since = 0,
  fullThreadPosts = DEFAULT_FULL_THREAD_POSTS,
): SwapTally {
  if (!myPlayerId || wonderNames.length === 0) {
    return EMPTY;
  }

  const triggers = buildTriggers(wonderNames);
  const threads = dedupeThreads(messagesData).map((t) => ({ ...t, posts: chronological(t.message.posts ?? []) }));
  const openings = openingsBySubject(threads, triggers, myPlayerId);
  const entries: SwapEntry[] = [];
  const pendingRequests: PendingRequest[] = [];
  const skipped: SkippedSwapThread[] = [];
  const fullThreads: FullThread[] = [];
  let latestRequestAt = 0;

  for (const { id, message, overviewAt, posts } of threads) {
    // The only thing that moves a thread's timestamp is a new post, so an overview newer than
    // the copy we hold means somebody has posted since we last fetched it — we just cannot see
    // who or what. The game sends the overview whenever the mail list refreshes but the posts
    // themselves only when the thread is actually opened, so this gap is the normal state of
    // affairs rather than an edge case.
    const lastKnownAt = posts.reduce((newest, p) => Math.max(newest, p.created_at ?? 0), message.updatedAt ?? 0);
    const stale = overviewAt > lastKnownAt;

    let mine = -1;
    for (let i = posts.length - 1; i >= 0; i--) {
      if (posts[i].author?.player_id === myPlayerId) {
        mine = i;
        break;
      }
    }
    if (mine < 0) {
      continue;
    }

    // A last post of yours that is not a request can still be your turn in the chain: the notice
    // that retires a full thread, with your request going into the new one instead. What marks
    // it is the new thread — yours, under the same title, opened within the same sitting — so
    // the notice itself can say anything. You still owe whoever posted before it.
    const replacement = triggers.has(normalize(posts[mine].post).toLowerCase())
      ? undefined
      : (openings.get(subjectKey(message.subject)) ?? []).find(
          (o) => o.threadId !== id && Math.abs(o.at - posts[mine].created_at) <= REPLACEMENT_WINDOW,
        );

    // Offered for retiring until its replacement is seen. A swap thread is one you have asked
    // in, so a long thread of guild chatter is left alone.
    if (
      !replacement &&
      posts.length >= fullThreadPosts &&
      posts.some((p) => p.author?.player_id === myPlayerId && triggers.has(normalize(p.post).toLowerCase()))
    ) {
      fullThreads.push({ threadId: id, subject: message.subject || '(no subject)', posts: posts.length });
    }

    const requestedWonder = replacement?.wonder ?? triggers.get(normalize(posts[mine].post).toLowerCase());
    if (!requestedWonder) {
      continue;
    }

    // Tracked before the watermark test, since clearing has to move past every round on
    // show — including ones with no payable recipient.
    const myPostedAt = posts[mine].created_at;
    latestRequestAt = Math.max(latestRequestAt, myPostedAt);

    const subject = message.subject || '(no subject)';
    const amount = parseSwapAmount(message.subject);

    // Nobody has posted after your request, so nobody has given to it yet — the chain pays
    // whoever posted last. Recorded regardless of the watermark and of whether the thread
    // owes anyone: clearing settles what you owe, not what is owed to you. Once somebody
    // does post, they have paid, and the wonder's own invested total says so instead.
    //
    // A stale thread is dropped for the same reason rather than in spite of it: the newer
    // timestamp is itself the news of a post after yours. Keeping it would go on subtracting
    // knowledge the wonder has already been given, since the payment reached the wonder's
    // invested total the moment it was made while the post reaches us only on the next fetch.
    //
    // A retired thread asks for nothing: your request is waiting in the new one instead.
    if (!replacement && !stale && mine === posts.length - 1 && amount.kind === 'amount') {
      pendingRequests.push({ threadId: id, requestedWonder, amount: amount.amount });
    }

    if (myPostedAt <= since) {
      continue;
    }

    let recipientPost: MessagePostVO | undefined;
    for (let i = mine - 1; i >= 0; i--) {
      if (posts[i].author?.player_id !== myPlayerId) {
        recipientPost = posts[i];
        break;
      }
    }
    // You opened the thread, so there is nobody ahead of you to pay.
    if (!recipientPost) {
      continue;
    }

    const recipientName = recipientPost.author?.name || 'Unknown';

    if (amount.kind !== 'amount') {
      skipped.push({ threadId: id, subject, recipientName, ambiguous: amount.kind === 'ambiguous' });
      continue;
    }

    entries.push({
      threadId: id,
      subject,
      amount: amount.amount,
      recipientName,
      recipientPlayerId: recipientPost.author?.player_id ?? 0,
      recipientPost: normalize(recipientPost.post),
      recipientPostedAt: recipientPost.created_at,
      requestedWonder,
      myPostedAt,
    });
  }

  entries.sort((a, b) => b.myPostedAt - a.myPostedAt);
  skipped.sort((a, b) => a.subject.localeCompare(b.subject));
  fullThreads.sort((a, b) => b.posts - a.posts || a.subject.localeCompare(b.subject));

  return { entries, pendingRequests, skipped, fullThreads, latestRequestAt };
}
