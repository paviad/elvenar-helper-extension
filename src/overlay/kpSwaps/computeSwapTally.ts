import { GameMessage, MessagePostVO, MessagesData } from '../../model/gameMessage';
import { SkippedSwapThread, SwapEntry, SwapTally } from '../../model/kpSwap';
import { parseSwapAmount } from './parseSwapAmount';

const EMPTY: SwapTally = { entries: [], skipped: [], latestRequestAt: 0 };

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

/**
 * One copy of each thread. A thread can sit in both folders; keep whichever copy holds more
 * posts, since a thread we only know from an overview may have been stored with fewer.
 */
function dedupeThreads(messagesData: MessagesData | undefined): { id: string; message: GameMessage }[] {
  const best = new Map<string, GameMessage>();

  for (const folder of Object.values(messagesData ?? {})) {
    for (const [id, message] of Object.entries(folder?.messages ?? {})) {
      const existing = best.get(id);
      if (!existing || (message.posts?.length ?? 0) > (existing.posts?.length ?? 0)) {
        best.set(id, message);
      }
    }
  }

  return [...best.entries()].map(([id, message]) => ({ id, message }));
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
 */
export function computeSwapTally(
  messagesData: MessagesData | undefined,
  wonderNames: string[],
  myPlayerId: number | undefined,
  since = 0,
): SwapTally {
  if (!myPlayerId || wonderNames.length === 0) {
    return EMPTY;
  }

  const triggers = buildTriggers(wonderNames);
  const entries: SwapEntry[] = [];
  const skipped: SkippedSwapThread[] = [];
  let latestRequestAt = 0;

  for (const { id, message } of dedupeThreads(messagesData)) {
    const posts = chronological(message.posts ?? []);

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

    const requestedWonder = triggers.get(normalize(posts[mine].post).toLowerCase());
    if (!requestedWonder) {
      continue;
    }

    // Tracked before the watermark test, since clearing has to move past every round on
    // show — including ones with no payable recipient.
    const myPostedAt = posts[mine].created_at;
    latestRequestAt = Math.max(latestRequestAt, myPostedAt);
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

    const subject = message.subject || '(no subject)';
    const recipientName = recipientPost.author?.name || 'Unknown';
    const amount = parseSwapAmount(message.subject);

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

  return { entries, skipped, latestRequestAt };
}
