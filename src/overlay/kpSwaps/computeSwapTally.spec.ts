import { GameMessage, MessageFolder, MessagePostVO, MessagesData } from '../../model/gameMessage';
import { DEFAULT_FULL_THREAD_POSTS as FULL_THREAD_POSTS } from '../../model/kpSwap';
import { computeSwapTally } from './computeSwapTally';

const ME = 100;
const ALICE = 200;
const BOB = 300;

const NAMES: Record<number, string> = { [ME]: 'Me', [ALICE]: 'Alice', [BOB]: 'Bob' };

const WONDERS = ['Golden Abyss', 'Needles of the Tempest', 'Martial Monastery'];

let nextPostId = 1;

function post(playerId: number, text: string, createdAt: number): MessagePostVO {
  return {
    post_id: nextPostId++,
    author: { player_id: playerId, name: NAMES[playerId] },
    post: text,
    created_at: createdAt,
  };
}

/** A thread whose posts are spaced one minute apart in the order given. */
function thread(id: number, subject: string, posts: MessagePostVO[]): GameMessage {
  return {
    id,
    subject,
    initiator: { player_id: ALICE, name: 'Alice' },
    status: 'read',
    posts,
    created_at: '',
    updatedAt: posts[posts.length - 1]?.created_at ?? 0,
  };
}

function inbox(...threads: GameMessage[]): MessagesData {
  return {
    inbox: {
      overview: Object.fromEntries(threads.map((t) => [String(t.id), t.updatedAt])),
      messages: Object.fromEntries(threads.map((t) => [String(t.id), t])),
    },
  };
}

// Default the watermark to 0, so the bulk of the specs exercise the matching rules alone.
const tally = (data: MessagesData, since = 0) => computeSwapTally(data, WONDERS, ME, since);

beforeEach(() => {
  nextPostId = 1;
});

describe('computeSwapTally', () => {
  it('owes the poster before your request', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [
        post(BOB, 'Martial Monastery please', 100),
        post(ALICE, 'Needles of the Tempest please', 200),
        post(ME, 'Golden Abyss please', 300),
      ]),
    );

    expect(tally(data).entries).toEqual([
      expect.objectContaining({
        threadId: '7',
        subject: '60 KP Thread',
        amount: 60,
        recipientName: 'Alice',
        recipientPlayerId: ALICE,
        recipientPost: 'Needles of the Tempest please',
        requestedWonder: 'Golden Abyss',
        myPostedAt: 300,
      }),
    ]);
  });

  it('keeps the entry when someone posts after you, so it survives while you repay', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 200),
        post(BOB, 'Martial Monastery please', 300),
      ]),
    );

    expect(tally(data).entries).toMatchObject([{ recipientName: 'Alice', amount: 60 }]);
  });

  it('treats consecutive posts of your own as changing your mind, not a new round', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 200),
        post(ME, 'Martial Monastery please', 300),
      ]),
    );

    // One debt, to Alice, and the wonder shown is the one you settled on.
    expect(tally(data).entries).toMatchObject([{ recipientName: 'Alice', requestedWonder: 'Martial Monastery' }]);
  });

  it('treats a post of your own after somebody else as the next round', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 200),
        post(BOB, 'Martial Monastery please', 300),
        post(ME, 'Needles of the Tempest please', 400),
      ]),
    );

    // Only the newest round stands: the Alice debt was settled last time round.
    expect(tally(data).entries).toMatchObject([{ recipientName: 'Bob', myPostedAt: 400 }]);
  });

  it('ignores a thread you started but nobody has answered', () => {
    const data = inbox(thread(7, '60 KP Thread', [post(ME, 'Golden Abyss please', 100)]));

    expect(tally(data).entries).toEqual([]);
    expect(tally(data).skipped).toEqual([]);
  });

  it('ignores a thread where your last post is not a request', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [post(ALICE, 'Golden Abyss please', 100), post(ME, 'thanks all!', 200)]),
    );

    expect(tally(data).entries).toEqual([]);
  });

  it('ignores a thread you never posted in', () => {
    const data = inbox(
      thread(7, '60 KP Thread', [post(ALICE, 'Golden Abyss please', 100), post(BOB, 'Martial Monastery please', 200)]),
    );

    expect(tally(data).entries).toEqual([]);
  });

  describe('the trigger is an exact "<wonder> please" post', () => {
    const withMyPost = (text: string) =>
      tally(inbox(thread(7, '60 KP Thread', [post(ALICE, 'anything', 100), post(ME, text, 200)])));

    it.each([
      ['Golden Abyss please'],
      ['golden abyss please'], // case-insensitive
      ['  Golden Abyss please  '], // surrounding whitespace only
      ['Golden Abyss please\r'], // the game's own line break
    ])('matches %s', (text) => {
      expect(withMyPost(text).entries).toHaveLength(1);
    });

    it.each([
      ['Golden Abyss please!'], // trailing punctuation is a suffix
      ['Hi, Golden Abyss please'], // prefix
      ['Golden Abyss please, thanks'],
      ['Golden Abyss'], // no "please"
      ['please'],
      ['Some Other Wonder please'], // not in the catalog
    ])('does not match %s', (text) => {
      expect(withMyPost(text).entries).toEqual([]);
    });
  });

  it('skips a thread whose subject has no usable amount, and says who it was for', () => {
    const data = inbox(
      thread(7, 'AW swap thread', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 200),
      ]),
    );

    const result = tally(data);

    expect(result.entries).toEqual([]);
    expect(result.skipped).toEqual([
      { threadId: '7', subject: 'AW swap thread', recipientName: 'Alice', ambiguous: false },
    ]);
  });

  it('flags a subject that names two different amounts as ambiguous', () => {
    const data = inbox(
      thread(7, '20 KP and 40 KP swap', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 200),
      ]),
    );

    expect(tally(data).skipped).toMatchObject([{ ambiguous: true }]);
  });

  it('lists the newest debt first', () => {
    const data = inbox(
      thread(1, '10 KP SWAP', [post(ALICE, 'x', 100), post(ME, 'Golden Abyss please', 200)]),
      thread(2, '60 KP Thread', [post(BOB, 'y', 300), post(ME, 'Golden Abyss please', 400)]),
    );

    expect(tally(data).entries.map((e) => e.threadId)).toEqual(['2', '1']);
  });

  it('counts a thread held in both folders once, keeping the fuller copy', () => {
    const full = thread(7, '60 KP Thread', [
      post(ALICE, 'Needles of the Tempest please', 100),
      post(ME, 'Golden Abyss please', 200),
    ]);
    const partial = thread(7, '60 KP Thread', [post(ME, 'Golden Abyss please', 200)]);
    const folder = (name: MessageFolder, t: GameMessage) => ({
      [name]: { overview: { '7': t.updatedAt }, messages: { '7': t } },
    });

    const data: MessagesData = { ...folder('outbox', partial), ...folder('inbox', full) };

    expect(tally(data).entries).toMatchObject([{ recipientName: 'Alice' }]);
  });

  it('orders same-second posts by post id', () => {
    // Alice and I both post in the same second; the ids say I came second.
    const data = inbox(
      thread(7, '60 KP Thread', [
        post(ALICE, 'Needles of the Tempest please', 100),
        post(ME, 'Golden Abyss please', 100),
      ]),
    );

    expect(tally(data).entries).toMatchObject([{ recipientName: 'Alice' }]);
  });

  it('yields nothing without a player id or a wonder catalog', () => {
    const data = inbox(thread(7, '60 KP Thread', [post(ALICE, 'x', 100), post(ME, 'Golden Abyss please', 200)]));

    const empty = { entries: [], pendingRequests: [], skipped: [], fullThreads: [], latestRequestAt: 0 };

    expect(computeSwapTally(data, WONDERS, undefined)).toEqual(empty);
    expect(computeSwapTally(data, [], ME)).toEqual(empty);
  });

  it('yields nothing when no messages are stored', () => {
    const empty = { entries: [], pendingRequests: [], skipped: [], fullThreads: [], latestRequestAt: 0 };

    expect(computeSwapTally(undefined, WONDERS, ME)).toEqual(empty);
    expect(computeSwapTally({}, WONDERS, ME)).toEqual(empty);
  });

  // You post a request in every round, so a thread's most recent post of yours is a request
  // whether the round is live or was settled days ago. The watermark is what tells them apart.
  describe('a full thread replaced by a new one', () => {
    // The old thread: Bob, then Alice asking, then your notice retiring it.
    const retired = (noticeAt = 300, subject = '20 KP Thread') =>
      thread(7, subject, [
        post(BOB, 'Martial Monastery please', 100),
        post(ALICE, 'Needles of the Tempest please', 200),
        post(ME, 'Please DELETE, starting a new thread', noticeAt),
      ]);
    const fresh = (openedAt = 310, subject = '20 KP Thread', by = ME) =>
      thread(8, subject, [post(by, 'Golden Abyss please', openedAt)]);

    it('still owes whoever posted before your notice, for the wonder you asked for in the new thread', () => {
      const result = tally(inbox(retired(), fresh()));

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        threadId: '7',
        amount: 20,
        recipientName: 'Alice',
        recipientPlayerId: ALICE,
        requestedWonder: 'Golden Abyss',
        myPostedAt: 300,
      });
    });

    it('waits for payment in the new thread only', () => {
      const result = tally(inbox(retired(), fresh()));

      expect(result.pendingRequests).toEqual([{ threadId: '8', requestedWonder: 'Golden Abyss', amount: 20 }]);
    });

    it('recognises it whichever of the two you did first', () => {
      expect(tally(inbox(retired(400), fresh(310))).entries).toHaveLength(1);
    });

    it('lets clearing retire it like any other round', () => {
      expect(tally(inbox(retired(), fresh()), 310).entries).toEqual([]);
    });

    it('matches the title however it is spaced or capitalised', () => {
      expect(tally(inbox(retired(), fresh(310, '  20 kp   thread '))).entries).toHaveLength(1);
    });

    it('does not take a new thread under another title for a replacement', () => {
      expect(tally(inbox(retired(), fresh(310, '30 KP Thread'))).entries).toEqual([]);
    });

    it('does not take a thread someone else opened for a replacement', () => {
      expect(tally(inbox(retired(), fresh(310, '20 KP Thread', BOB))).entries).toEqual([]);
    });

    it('does not reach back to a thread opened in another sitting', () => {
      expect(tally(inbox(retired(300), fresh(300 + 31 * 60))).entries).toEqual([]);
    });
  });

  describe('fullThreads', () => {
    /** A thread of `count` posts, alternating Bob and Alice, with `mine` as your last word. */
    const long = (id: number, count: number, mine = 'Golden Abyss please', subject = '20 KP Thread') =>
      thread(id, subject, [
        ...Array.from({ length: count - 1 }, (_, i) => post(i % 2 ? ALICE : BOB, 'Martial Monastery please', i + 1)),
        post(ME, mine, count),
      ]);

    it('offers a swap thread for retiring once it is long enough', () => {
      expect(tally(inbox(long(7, FULL_THREAD_POSTS))).fullThreads).toEqual([
        { threadId: '7', subject: '20 KP Thread', posts: FULL_THREAD_POSTS },
      ]);
    });

    it('leaves a shorter one alone', () => {
      expect(tally(inbox(long(7, FULL_THREAD_POSTS - 1))).fullThreads).toEqual([]);
    });

    it('keeps offering it after the notice, until the new thread is seen', () => {
      const noticed = long(7, FULL_THREAD_POSTS, 'Please DELETE starting new thread');
      noticed.posts.splice(-1, 0, post(ME, 'Golden Abyss please', FULL_THREAD_POSTS - 0.5));

      expect(tally(inbox(noticed)).fullThreads.map((f) => f.threadId)).toEqual(['7']);

      const replacement = thread(8, '20 KP Thread', [post(ME, 'Needles of the Tempest please', FULL_THREAD_POSTS + 5)]);
      expect(tally(inbox(noticed, replacement)).fullThreads).toEqual([]);
    });

    it('leaves out a long thread you never asked in', () => {
      const chatter = long(7, FULL_THREAD_POSTS, 'Happy birthday!', 'Guild chat');

      expect(tally(inbox(chatter)).fullThreads).toEqual([]);
    });

    it('goes by the size you set', () => {
      const data = inbox(long(7, 150));

      expect(computeSwapTally(data, WONDERS, ME, 0, 150).fullThreads.map((f) => f.threadId)).toEqual(['7']);
      expect(computeSwapTally(data, WONDERS, ME, 0, 151).fullThreads).toEqual([]);
    });

    it('lists the longest first', () => {
      const result = tally(
        inbox(long(7, FULL_THREAD_POSTS), long(8, FULL_THREAD_POSTS + 20, 'Golden Abyss please', '10 KP Thread')),
      );

      expect(result.fullThreads.map((f) => f.threadId)).toEqual(['8', '7']);
    });
  });

  describe('watermark', () => {
    const twoRounds = () =>
      inbox(
        thread(1, '10 KP SWAP', [post(ALICE, 'x', 100), post(ME, 'Golden Abyss please', 200)]),
        thread(2, '60 KP Thread', [post(BOB, 'y', 300), post(ME, 'Martial Monastery please', 400)]),
      );

    it('leaves out rounds you posted at or before it', () => {
      expect(tally(twoRounds(), 200).entries.map((e) => e.threadId)).toEqual(['2']);
      expect(tally(twoRounds(), 400).entries).toEqual([]);
    });

    it('reports your newest request whatever the watermark, so clearing can move past it', () => {
      expect(tally(twoRounds(), 0).latestRequestAt).toBe(400);
      expect(tally(twoRounds(), 400).latestRequestAt).toBe(400);
      expect(tally(twoRounds(), Infinity).latestRequestAt).toBe(400);
    });

    it('counts a request with no payable recipient towards the watermark', () => {
      // Nothing to owe here, but clearing still has to move past it or it blocks the next one.
      const data = inbox(thread(7, '60 KP Thread', [post(ME, 'Golden Abyss please', 500)]));

      expect(tally(data).latestRequestAt).toBe(500);
    });

    it('ignores posts that are not requests when reporting the newest', () => {
      const data = inbox(
        thread(7, '60 KP Thread', [post(ALICE, 'x', 100), post(ME, 'Golden Abyss please', 200), post(ME, 'ta!', 900)]),
      );

      // Your latest post is chatter, so the thread has no live round at all.
      expect(tally(data).latestRequestAt).toBe(0);
      expect(tally(data).entries).toEqual([]);
    });

    it('holds everything back until a watermark is established', () => {
      expect(tally(twoRounds(), Infinity).entries).toEqual([]);
      expect(tally(twoRounds(), Infinity).skipped).toEqual([]);
    });

    it('leaves a thread with an unreadable amount out of the skipped list once settled', () => {
      const data = inbox(thread(7, 'AW swap thread', [post(ALICE, 'x', 100), post(ME, 'Golden Abyss please', 200)]));

      expect(tally(data, 0).skipped).toHaveLength(1);
      expect(tally(data, 200).skipped).toEqual([]);
    });
  });

  // The chain gives to whoever posted last, so a request is unpaid exactly while it is still
  // the last post in its thread. These are what the wonder's room-left figure is reduced by.
  describe('pendingRequests', () => {
    it('reports a request nobody has posted after', () => {
      const data = inbox(
        thread(7, '60 KP Thread', [post(ALICE, 'Martial Monastery please', 100), post(ME, 'Golden Abyss please', 200)]),
      );

      expect(tally(data).pendingRequests).toEqual([{ threadId: '7', requestedWonder: 'Golden Abyss', amount: 60 }]);
    });

    it('drops a request once somebody has posted after it, since that is the payment', () => {
      const data = inbox(
        thread(7, '60 KP Thread', [
          post(ALICE, 'Martial Monastery please', 100),
          post(ME, 'Golden Abyss please', 200),
          post(BOB, 'Needles of the Tempest please', 300),
        ]),
      );

      expect(tally(data).pendingRequests).toEqual([]);
    });

    it('survives the watermark, unlike the debts', () => {
      const data = inbox(
        thread(7, '60 KP Thread', [post(ALICE, 'Martial Monastery please', 100), post(ME, 'Golden Abyss please', 200)]),
      );

      // Clearing settles what you owe; what is owed to you is untouched by it.
      expect(tally(data, 200).entries).toEqual([]);
      expect(tally(data, 200).pendingRequests).toHaveLength(1);
    });

    it('counts a thread you opened yourself, which owes nobody but still pays you', () => {
      const data = inbox(thread(7, '40 KP SWAP', [post(ME, 'Golden Abyss please', 100)]));

      expect(tally(data).entries).toEqual([]);
      expect(tally(data).pendingRequests).toEqual([{ threadId: '7', requestedWonder: 'Golden Abyss', amount: 40 }]);
    });

    it('counts a run of your own posts once, at the wonder you settled on', () => {
      const data = inbox(
        thread(7, '60 KP Thread', [
          post(ALICE, 'Martial Monastery please', 100),
          post(ME, 'Golden Abyss please', 200),
          post(ME, 'Needles of the Tempest please', 300),
        ]),
      );

      expect(tally(data).pendingRequests).toEqual([
        { threadId: '7', requestedWonder: 'Needles of the Tempest', amount: 60 },
      ]);
    });

    it('ignores a thread whose amount cannot be read', () => {
      const data = inbox(thread(7, 'AW swap thread', [post(ME, 'Golden Abyss please', 100)]));

      expect(tally(data).pendingRequests).toEqual([]);
    });

    // Posts arrive only when a thread is actually fetched, while the overview arrives whenever
    // the mail list refreshes. In between, the overview is all we know about the newest post.
    describe('a thread the overview says has moved on', () => {
      const stale = (overviewAt: number) => {
        const data = inbox(
          thread(7, '60 KP Thread', [
            post(ALICE, 'Martial Monastery please', 100),
            post(ME, 'Golden Abyss please', 200),
          ]),
        );
        data.inbox!.overview['7'] = overviewAt;
        return tally(data);
      };

      it('drops the request, since the newer timestamp is somebody posting after you', () => {
        expect(stale(300).pendingRequests).toEqual([]);
      });

      it('keeps the request while the overview agrees with the posts we hold', () => {
        expect(stale(200).pendingRequests).toHaveLength(1);
      });

      it('keeps what you owe, which no later post settles', () => {
        expect(stale(300).entries).toMatchObject([{ recipientName: 'Alice', amount: 60 }]);
      });
    });
  });
});
