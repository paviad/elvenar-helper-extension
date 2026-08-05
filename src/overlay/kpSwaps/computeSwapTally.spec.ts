import { GameMessage, MessageFolder, MessagePostVO, MessagesData } from '../../model/gameMessage';
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

const tally = (data: MessagesData) => computeSwapTally(data, WONDERS, ME);

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

    expect(tally(data)).toEqual({ entries: [], skipped: [] });
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

    expect(computeSwapTally(data, WONDERS, undefined)).toEqual({ entries: [], skipped: [] });
    expect(computeSwapTally(data, [], ME)).toEqual({ entries: [], skipped: [] });
  });

  it('yields nothing when no messages are stored', () => {
    expect(computeSwapTally(undefined, WONDERS, ME)).toEqual({ entries: [], skipped: [] });
    expect(computeSwapTally({}, WONDERS, ME)).toEqual({ entries: [], skipped: [] });
  });
});
