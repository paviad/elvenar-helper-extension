import { GameMessage, MessagesData } from '../model/gameMessage';
import { applyRecruitEdit } from './editRecruit';
import {
  activitySignList,
  activitySigns,
  activityVerdict,
  chapterStatus,
  clearDiagnostics,
  describeForDiagnostics,
  emptyRecruitBook,
  fellowshipProfile,
  fellowshipTimeline,
  markUnranked,
  MAX_DIAGNOSTICS,
  Me,
  nextScoreRefresh,
  pruneRecruitBook,
  recordActivity,
  recordDiagnostic,
  recordMyGuild,
  recordSighting,
  RecruitBook,
  Sighting,
  summariseSigns,
  syncFromMessages,
} from './recruitBook';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1);
const me: Me = { playerId: 1, guildId: 100 };
const settings = { windowDays: 7, minSigns: 1 };

const sighting = (overrides: Partial<Sighting> = {}): Sighting => ({
  playerId: 42,
  name: 'Elfie',
  source: 'neighbour',
  at: T0,
  chapter: 7,
  guild: null,
  ...overrides,
});

const bookWith = (...sightings: Sighting[]) => {
  const book = emptyRecruitBook();
  sightings.forEach((s) => recordSighting(book, s, me));
  return book;
};

describe('recordSighting', () => {
  it('starts tracking a guildless player from chapter 5', () => {
    const book = bookWith(sighting({ chapter: 5 }));
    expect(book.recruits['42']).toMatchObject({ name: 'Elfie', chapter: 5, stage: 'new', sources: ['neighbour'] });
  });

  it('passes over players below chapter 5', () => {
    expect(bookWith(sighting({ chapter: 4 })).recruits).toEqual({});
  });

  it('passes over players already in a fellowship', () => {
    expect(bookWith(sighting({ guild: { id: 7, name: 'Others' } })).recruits).toEqual({});
  });

  it('passes over a source that does not say about fellowship, unless it is a message', () => {
    expect(bookWith(sighting({ guild: undefined, source: 'ranking' })).recruits).toEqual({});
    expect(
      bookWith(sighting({ guild: undefined, source: 'message', chapter: undefined })).recruits['42'],
    ).toBeDefined();
  });

  it('never tracks you or your fellowship mates', () => {
    const book = emptyRecruitBook();
    recordMyGuild(book, { id: 100, memberIds: [42] }, T0);
    recordSighting(book, sighting(), me);
    recordSighting(book, sighting({ playerId: 1 }), me);
    expect(book.recruits).toEqual({});
  });

  it('tracks a guildless ranking row with no chapter, for checking later', () => {
    const book = bookWith(sighting({ source: 'ranking', chapter: undefined, score: 300000 }));
    expect(book.recruits['42'].chapter).toBeUndefined();
    expect(book.recruits['42'].scores).toEqual([{ at: T0, score: 300000 }]);
  });

  it('moves a candidate seen in another fellowship to joinedElsewhere, and back when they leave', () => {
    const book = bookWith(sighting(), sighting({ at: T0 + DAY, guild: { id: 7, name: 'Others' } }));
    expect(book.recruits['42']).toMatchObject({ stage: 'joinedElsewhere', guild: { id: 7, name: 'Others' } });

    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].stage).toBe('new');
    expect(book.recruits['42'].guild).toBeUndefined();
  });

  it('moves a candidate seen in your fellowship to joined', () => {
    const book = bookWith(sighting(), sighting({ at: T0 + DAY, guild: { id: 100 } }));
    expect(book.recruits['42'].stage).toBe('joined');
  });

  it('ignores a fellowship reading older than the one already held', () => {
    const book = bookWith(sighting({ at: T0 + DAY }), sighting({ at: T0, guild: { id: 7 } }));
    expect(book.recruits['42'].stage).toBe('new');
  });

  it('stores a score only when it moves', () => {
    const book = bookWith(
      sighting({ score: 100 }),
      sighting({ at: T0 + DAY, score: 100 }),
      sighting({ at: T0 + 2 * DAY, score: 150 }),
    );
    expect(book.recruits['42'].scores).toEqual([
      { at: T0, score: 100 },
      { at: T0 + 2 * DAY, score: 150 },
    ]);
    expect(book.recruits['42'].scoreCheckedAt).toBe(T0 + 2 * DAY);
  });
});

describe('recordMyGuild', () => {
  it('marks candidates now in your fellowship as joined', () => {
    const book = bookWith(sighting());
    recordMyGuild(book, { id: 100, memberIds: [42, 5] }, T0 + DAY);
    expect(book.recruits['42'].stage).toBe('joined');
  });
});

describe('activityVerdict', () => {
  const now = T0 + 10 * DAY;

  it('is active after one score rise inside the window', () => {
    const book = bookWith(sighting({ score: 100, at: T0 + 5 * DAY }), sighting({ score: 120, at: T0 + 6 * DAY }));
    expect(activityVerdict(book.recruits['42'], settings, now)).toBe('active');
  });

  it('counts a drop in score as a sign too', () => {
    const book = bookWith(sighting({ score: 120, at: T0 + 5 * DAY }), sighting({ score: 100, at: T0 + 6 * DAY }));
    expect(activityVerdict(book.recruits['42'], settings, now)).toBe('active');
  });

  it('respects a higher sign count', () => {
    const book = bookWith(sighting({ score: 100, at: T0 + 5 * DAY }), sighting({ score: 120, at: T0 + 6 * DAY }));
    expect(activityVerdict(book.recruits['42'], { windowDays: 7, minSigns: 2 }, now)).toBe('unclear');
  });

  it('is unclear before the score has been watched for the whole window', () => {
    const book = bookWith(sighting({ score: 100, at: T0 + 5 * DAY }), sighting({ score: 100, at: T0 + 9 * DAY }));
    expect(activityVerdict(book.recruits['42'], settings, now)).toBe('unclear');
  });

  it('is dormant once a flat score has been watched for the whole window, up to recently', () => {
    const book = bookWith(sighting({ score: 100, at: T0 }), sighting({ score: 100, at: T0 + 9 * DAY }));
    expect(activityVerdict(book.recruits['42'], settings, now)).toBe('dormant');
  });

  it('is unclear when the last reading is older than the window', () => {
    const book = bookWith(sighting({ score: 100, at: T0 }), sighting({ score: 100, at: T0 + 8 * DAY }));
    expect(activityVerdict(book.recruits['42'], settings, T0 + 20 * DAY)).toBe('unclear');
  });

  it('is dormant when the game says the player is inactive', () => {
    const book = bookWith(sighting({ isActive: false }));
    expect(activityVerdict(book.recruits['42'], settings, now)).toBe('dormant');
  });
});

describe('syncFromMessages', () => {
  const post = (playerId: number, name: string, at: number) => ({
    author: { player_id: playerId, name },
    post: 'hi',
    created_at: at / 1000,
  });
  const thread = (overrides: Partial<GameMessage>): GameMessage => ({
    id: 9,
    subject: 'Join us?',
    initiator: { player_id: 1, name: 'Me' },
    recipients: ['Elfie'],
    status: 'read',
    posts: [],
    created_at: '',
    updatedAt: T0 / 1000,
    ...overrides,
  });
  const inOutbox = (...messages: GameMessage[]): MessagesData => ({
    outbox: { overview: {}, messages: Object.fromEntries(messages.map((m) => [String(m.id), m])) },
  });

  it('marks a candidate contacted, then replied, and counts their posts as activity', () => {
    const book = bookWith(sighting());
    syncFromMessages(book, inOutbox(thread({ posts: [post(1, 'Me', T0 + DAY)] })), me);
    expect(book.recruits['42']).toMatchObject({ stage: 'contacted', contactedAt: T0 + DAY });

    syncFromMessages(book, inOutbox(thread({ posts: [post(1, 'Me', T0 + DAY), post(42, 'Elfie', T0 + 2 * DAY)] })), me);
    expect(book.recruits['42']).toMatchObject({
      stage: 'replied',
      repliedAt: T0 + 2 * DAY,
      activity: [{ at: T0 + 2 * DAY, kind: 'message', detail: 'Join us?' }],
    });
  });

  it('does not undo a stage set by hand', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, stage: 'declined' }, T0);
    syncFromMessages(book, inOutbox(thread({ posts: [post(1, 'Me', T0 + DAY)] })), me);
    expect(book.recruits['42'].stage).toBe('declined');
  });

  it('adds a stranger who wrote to you, and leaves fellowship threads alone', () => {
    const book: RecruitBook = emptyRecruitBook();
    const data: MessagesData = {
      inbox: {
        overview: {},
        messages: {
          1: thread({ id: 1, initiator: { player_id: 77, name: 'Stranger' }, posts: [post(77, 'Stranger', T0)] }),
          2: thread({ id: 2, initiator: { player_id: 88, name: 'Mate' }, guildId: 100, posts: [post(88, 'Mate', T0)] }),
        },
      },
    };
    syncFromMessages(book, data, me);
    expect(Object.keys(book.recruits)).toEqual(['77']);
    expect(book.recruits['77']).toMatchObject({
      sources: ['message'],
      activity: [{ at: T0, kind: 'message', detail: 'Join us?' }],
    });
  });
});

describe('pruneRecruitBook', () => {
  it('drops no real candidate, however many there are', () => {
    const book = emptyRecruitBook();
    for (let i = 0; i < 2500; i++) {
      recordSighting(book, sighting({ playerId: 1000 + i, at: T0 + i }), me);
    }
    pruneRecruitBook(book);
    expect(Object.keys(book.recruits)).toHaveLength(2500);
  });
});

describe('nextScoreRefresh', () => {
  it('picks the open candidate read longest ago, skipping closed ones and those asked about', () => {
    const book = bookWith(
      sighting({ playerId: 1, name: 'me' }),
      sighting({ playerId: 2, score: 1, at: T0 }),
      sighting({ playerId: 3, score: 1, at: T0 + DAY }),
      sighting({ playerId: 4, at: T0 }),
    );
    applyRecruitEdit(book, { playerId: 4, stage: 'dismissed' }, T0);
    expect(nextScoreRefresh(book, T0 + 2 * DAY)?.playerId).toBe(2);
    expect(nextScoreRefresh(book, T0 + 2 * DAY, (id) => id === 2)?.playerId).toBe(3);
    expect(nextScoreRefresh(book, T0)).toBeUndefined();
  });
});

describe('diagnostics', () => {
  const diagnostic = (n: number) => ({ at: T0 + n, where: 'score lookup (page)', message: `problem ${n}` });

  it('stops the refresher on the first problem that asks to, and keeps that reason', () => {
    const book = emptyRecruitBook();
    recordDiagnostic(book, diagnostic(1), false);
    expect(book.scoreRefreshOff).toBeUndefined();

    recordDiagnostic(book, diagnostic(2), true);
    recordDiagnostic(book, diagnostic(3), true);
    expect(book.scoreRefreshOff).toEqual({ at: T0 + 2, reason: 'score lookup (page): problem 2' });
    expect(book.diagnostics).toHaveLength(3);
  });

  it('keeps only the newest', () => {
    const book = emptyRecruitBook();
    for (let i = 0; i < MAX_DIAGNOSTICS + 5; i++) {
      recordDiagnostic(book, diagnostic(i), false);
    }
    expect(book.diagnostics).toHaveLength(MAX_DIAGNOSTICS);
    expect(book.diagnostics![0].message).toBe('problem 5');
  });

  it('clears and lets the refresher run again', () => {
    const book = emptyRecruitBook();
    recordDiagnostic(book, diagnostic(1), true);
    clearDiagnostics(book);
    expect(book.diagnostics).toBeUndefined();
    expect(book.scoreRefreshOff).toBeUndefined();
  });

  it('describes errors by their stack, anything else as JSON, and cuts it short', () => {
    expect(describeForDiagnostics(new TypeError('boom'))).toContain('TypeError: boom');
    expect(describeForDiagnostics({ a: [1] })).toBe('{"a":[1]}');
    expect(describeForDiagnostics('x'.repeat(5000))).toMatch(/… \(5002 characters\)$/);
  });
});

describe('chapterStatus', () => {
  it('uses the chapter where it has been seen', () => {
    expect(chapterStatus(bookWith(sighting()).recruits['42'])).toBe('exact');
  });

  it('takes a score above 100k as chapter 5 or later', () => {
    const book = bookWith(sighting({ source: 'ranking', chapter: undefined, score: 100_001 }));
    expect(chapterStatus(book.recruits['42'])).toBe('byScore');
  });

  it('leaves a lower score, or none, undecided', () => {
    expect(
      chapterStatus(bookWith(sighting({ source: 'ranking', chapter: undefined, score: 100_000 })).recruits['42']),
    ).toBeUndefined();
    expect(
      chapterStatus(bookWith(sighting({ source: 'message', guild: undefined, chapter: undefined })).recruits['42']),
    ).toBeUndefined();
  });
});

describe('score kinds', () => {
  it('never counts a move between ranking points and the summed lookup as a rise', () => {
    const book = bookWith(
      sighting({ score: 300_000, at: T0 }),
      sighting({ score: 339_447, at: T0 + DAY, scoreKind: 'overview', source: 'profile' }),
    );
    expect(book.recruits['42'].scores).toHaveLength(2);
    expect(activityVerdict(book.recruits['42'], settings, T0 + 2 * DAY)).toBe('unclear');
  });

  it('counts a rise between two lookups', () => {
    const book = bookWith(
      sighting({ score: 300_000, at: T0 }),
      sighting({ score: 339_447, at: T0 + DAY, scoreKind: 'overview', source: 'profile' }),
      sighting({ score: 300_000, at: T0 + 2 * DAY }),
      sighting({ score: 339_500, at: T0 + 3 * DAY, scoreKind: 'overview', source: 'profile' }),
    );
    expect(activityVerdict(book.recruits['42'], settings, T0 + 4 * DAY)).toBe('active');
  });
});

describe('chapterStatus with a lower lookup sum', () => {
  it('keeps the 100k ranking figure even after a lower sum from the lookup', () => {
    const book = bookWith(
      sighting({ source: 'ranking', chapter: undefined, score: 150_000, at: T0 }),
      sighting({ source: 'profile', chapter: undefined, score: 90_000, scoreKind: 'overview', at: T0 + DAY }),
    );
    expect(chapterStatus(book.recruits['42'])).toBe('byScore');
  });
});

describe('players that are not players', () => {
  it('never tracks a negative id, such as the game system mail', () => {
    const book = bookWith(sighting({ playerId: -3, source: 'message', guild: undefined, chapter: undefined }));
    expect(book.recruits).toEqual({});
  });

  it('drops ones stored before that was checked', () => {
    const book = bookWith(sighting());
    book.recruits['-3'] = { ...book.recruits['42'], playerId: -3 };
    pruneRecruitBook(book);
    expect(Object.keys(book.recruits)).toEqual(['42']);
  });
});

describe('removing by hand', () => {
  it('keeps a removed guildless player hidden, whatever source sees them next', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0);
    recordSighting(book, sighting({ at: T0 + DAY }), me);
    recordSighting(book, sighting({ at: T0 + DAY, source: 'message', guild: undefined, chapter: undefined }), me);
    expect(book.recruits['42'].removedAt).toBe(T0);
  });

  it('brings back someone removed while in a fellowship once they are seen out of it', () => {
    const book = bookWith(sighting(), sighting({ at: T0 + DAY, guild: { id: 7, name: 'Others' } }));
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0 + 2 * DAY);
    expect(book.recruits['42']).toMatchObject({ removedAt: T0 + 2 * DAY, removedInFellowshipAt: T0 + DAY });

    // Still in it, or a source too old to know: they stay hidden.
    recordSighting(book, sighting({ at: T0 + 3 * DAY, guild: { id: 7 } }), me);
    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].removedAt).toBe(T0 + 2 * DAY);

    // Seen without a fellowship after the last time they were seen in one.
    recordSighting(book, sighting({ at: T0 + 4 * DAY }), me);
    expect(book.recruits['42'].removedAt).toBeUndefined();
    expect(book.recruits['42'].stage).toBe('new');
  });

  it('brings back a removed guildless player only after they join a fellowship and leave it', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0);
    recordSighting(book, sighting({ at: T0 + DAY, guild: { id: 7 } }), me);
    expect(book.recruits['42'].removedAt).toBe(T0);
    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].removedAt).toBeUndefined();
  });

  it('still keeps one removed before entries were kept off the list until they leave a fellowship', () => {
    const book = emptyRecruitBook();
    book.removed = { 42: { at: T0, inFellowshipAt: T0 } };
    recordSighting(book, sighting({ at: T0 - DAY }), me);
    expect(book.recruits['42']).toBeUndefined();
    recordSighting(book, sighting({ at: T0 + DAY }), me);
    expect(book.recruits['42']).toBeDefined();
  });
});

describe('the sign list', () => {
  const now = T0 + 10 * DAY;

  it('says what each sign was, newest first, and the count follows it', () => {
    const book = bookWith(sighting({ score: 1000, at: T0 + 2 * DAY }), sighting({ score: 900, at: T0 + 3 * DAY }));
    const recruit = book.recruits['42'];
    recordActivity(recruit, { at: T0 + 4 * DAY, kind: 'help', detail: 'Residence' });
    recordActivity(recruit, { at: T0 + 5 * DAY, kind: 'wonderKp', detail: '50 KP into Crystal Lighthouse' });
    recordActivity(recruit, { at: T0 + 6 * DAY, kind: 'message', detail: 'Hello' });

    const signs = activitySignList(recruit, settings, now);
    expect(signs.map((s) => s.text)).toEqual([
      'wrote to you: "Hello"',
      'put 50 KP into Crystal Lighthouse',
      'helped you (Residence)',
      'score -100 (ranking points)',
    ]);
    expect(activitySigns(recruit, settings, now)).toBe(4);
    expect(summariseSigns(signs)).toBe('message, KP into your wonder, helped you, score change');
  });

  it('groups repeats in the summary', () => {
    const book = bookWith(sighting());
    const recruit = book.recruits['42'];
    recordActivity(recruit, { at: T0 + 4 * DAY, kind: 'help' });
    recordActivity(recruit, { at: T0 + 5 * DAY, kind: 'help' });
    expect(summariseSigns(activitySignList(recruit, settings, now))).toBe('helped you ×2');
  });

  it('leaves out what happened before the window', () => {
    const book = bookWith(sighting());
    recordActivity(book.recruits['42'], { at: T0 - 30 * DAY, kind: 'help' });
    expect(activitySignList(book.recruits['42'], settings, now)).toEqual([]);
  });
});

describe('the exact score', () => {
  it('takes the newest exact figure even when it repeats an earlier one', () => {
    const book = bookWith(
      sighting({ source: 'ranking', score: 300_000, at: T0 }),
      sighting({ source: 'profile', score: 290_000, scoreKind: 'overview', at: T0 + DAY }),
      sighting({ source: 'visit', score: 300_000, at: T0 + 2 * DAY }),
    );
    expect(book.recruits['42'].exactScore).toEqual({ at: T0 + 2 * DAY, score: 300_000, source: 'visit' });
  });

  it('never takes the score lookup for an exact figure', () => {
    const book = bookWith(sighting({ source: 'profile', score: 290_000, scoreKind: 'overview', at: T0 }));
    expect(book.recruits['42'].exactScore).toBeUndefined();
  });

  it('keeps a newer exact figure over an older one that arrives later', () => {
    const book = bookWith(
      sighting({ source: 'visit', score: 310_000, at: T0 + 2 * DAY }),
      sighting({ source: 'ranking', score: 300_000, at: T0 }),
    );
    expect(book.recruits['42'].exactScore?.source).toBe('visit');
  });
});

describe('our own fellowship history', () => {
  it('records the first fellowship seen, then each change, and nothing that repeats', () => {
    const book = bookWith(
      sighting({ at: T0 }),
      sighting({ at: T0 + DAY }),
      sighting({ at: T0 + 2 * DAY, guild: { id: 7, name: 'Others' } }),
      sighting({ at: T0 + 3 * DAY, guild: { id: 7, name: 'Others' } }),
      sighting({ at: T0 + 4 * DAY }),
    );
    expect(book.recruits['42'].fellowshipChanges).toEqual([
      { at: T0, id: undefined, name: undefined },
      { at: T0 + 2 * DAY, id: 7, name: 'Others' },
      { at: T0 + 4 * DAY, id: undefined, name: undefined },
    ]);
  });

  it('dates a leaving we saw ourselves, and makes it a recent one', () => {
    const book = bookWith(
      sighting({ at: T0 }),
      sighting({ at: T0 + 2 * DAY, guild: { id: 7, name: 'Others' } }),
      sighting({ at: T0 + 4 * DAY }),
    );
    expect(fellowshipProfile(book.recruits['42'], T0 + 5 * DAY)).toEqual({
      kind: 'left',
      at: T0 + 4 * DAY,
      memberUntil: T0 + 4 * DAY,
      recently: true,
      count: 1,
      lastName: 'Others',
    });
  });

  it('does not call anyone solo from our sightings alone', () => {
    const book = bookWith(sighting({ at: T0 }), sighting({ at: T0 + 30 * DAY }));
    expect(fellowshipProfile(book.recruits['42'], T0 + 31 * DAY)).toBeUndefined();
    expect(fellowshipTimeline(book.recruits['42'])).toEqual([
      { at: T0, id: undefined, name: undefined, source: 'game', recorded: true },
    ]);
  });
});

describe('trade offers as signs', () => {
  it('counts an offer once by its id, and words it', () => {
    const book = bookWith(sighting());
    const recruit = book.recruits['42'];
    recordActivity(recruit, { at: T0 + DAY, kind: 'tradeOffer', detail: '120 marble for 80 steel', ref: 'trade:1' });
    recordActivity(recruit, {
      at: T0 + 2 * DAY,
      kind: 'tradeOffer',
      detail: '120 marble for 80 steel',
      ref: 'trade:1',
    });
    const signs = activitySignList(recruit, settings, T0 + 3 * DAY);
    expect(signs.map((s) => s.text)).toEqual(['offering 120 marble for 80 steel on the market']);
    expect(summariseSigns(signs)).toBe('trade offer');
  });
});

describe('several trade offers', () => {
  it('count as a single sign', () => {
    const book = bookWith(sighting());
    const recruit = book.recruits['42'];
    recordActivity(recruit, { at: T0 + DAY, kind: 'tradeOffer', detail: '120 marble for 80 steel', ref: 'trade:1' });
    recordActivity(recruit, { at: T0 + 2 * DAY, kind: 'tradeOffer', detail: '50 silk for 60 gems', ref: 'trade:2' });
    recordActivity(recruit, {
      at: T0 + 2 * DAY,
      kind: 'tradeOffer',
      detail: '10 planks for 9 crystal',
      ref: 'trade:3',
    });
    const signs = activitySignList(recruit, settings, T0 + 3 * DAY);
    expect(signs).toHaveLength(1);
    expect(signs[0]).toMatchObject({ at: T0 + 2 * DAY, kind: 'tradeOffer' });
    expect(signs[0].text).toMatch(/^3 trade offers on the market, the latest /);
  });
});

describe('gone', () => {
  it('leaves a stage set by hand, or a conversation under way, as it is', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, stage: 'contacted' }, T0);
    markUnranked(book.recruits['42'], T0 + DAY);
    expect(book.recruits['42'].stage).toBe('contacted');
  });

  it('is not undone by ElvenStats, only by the game seeing them again', () => {
    const book = bookWith(sighting());
    markUnranked(book.recruits['42'], T0 + DAY);
    recordSighting(book, sighting({ source: 'elvenstats', at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].stage).toBe('gone');
    recordSighting(book, sighting({ source: 'ranking', at: T0 + 3 * DAY, score: 5 }), me);
    expect(book.recruits['42'].stage).toBe('new');
    expect(book.recruits['42'].unrankedAt).toBeUndefined();
  });
});

describe('stored notifications of other kinds', () => {
  it('no longer count as signs', () => {
    const book = bookWith(sighting());
    recordActivity(book.recruits['42'], { at: T0 + DAY, kind: 'notification', detail: 'Guild' });
    expect(activitySignList(book.recruits['42'], settings, T0 + 2 * DAY)).toEqual([]);
  });
});

describe('former members of your fellowship', () => {
  it('closes someone once on your member list as soon as they are seen outside it', () => {
    const book = emptyRecruitBook();
    recordMyGuild(book, { id: 100, memberIds: [42, 5] }, T0);
    recordMyGuild(book, { id: 100, memberIds: [5] }, T0 + DAY);
    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].stage).toBe('formerMember');
  });

  it('closes a recruit who had joined and is no longer on the list', () => {
    const book = bookWith(sighting());
    recordMyGuild(book, { id: 100, memberIds: [42] }, T0 + DAY);
    expect(book.recruits['42'].stage).toBe('joined');
    recordMyGuild(book, { id: 100, memberIds: [] }, T0 + 2 * DAY);
    expect(book.recruits['42'].stage).toBe('formerMember');
  });

  it('closes a candidate whose fellowship history shows your fellowship', () => {
    const book = emptyRecruitBook();
    recordMyGuild(book, { id: 100, memberIds: [5] }, T0);
    recordSighting(book, sighting({ at: T0, guild: null }), me);
    book.recruits['42'].elvenStats = {
      checkedAt: T0,
      found: true,
      updatedAt: T0,
      fellowships: [
        { at: T0 - 100 * DAY, id: 100, name: 'Mine' },
        { at: T0 - DAY, id: undefined, name: undefined },
      ],
    };
    recordSighting(book, sighting({ at: T0 + DAY }), me);
    expect(book.recruits['42'].stage).toBe('formerMember');
  });

  it('leaves a stage set by hand alone', () => {
    const book = emptyRecruitBook();
    recordMyGuild(book, { id: 100, memberIds: [42] }, T0);
    recordMyGuild(book, { id: 100, memberIds: [] }, T0 + DAY);
    // Not yet a candidate when they were on the list, so added now - and closed straight away.
    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    applyRecruitEdit(book, { playerId: 42, stage: 'contacted' }, T0 + 3 * DAY);
    recordSighting(book, sighting({ at: T0 + 4 * DAY }), me);
    expect(book.recruits['42'].stage).toBe('contacted');
  });
});

describe('removing keeps the entry', () => {
  const post = (playerId: number, at: number) => ({
    author: { player_id: playerId, name: 'x' },
    post: 'hi',
    created_at: at / 1000,
  });
  const threads = (...posts: ReturnType<typeof post>[]): MessagesData => ({
    inbox: {
      overview: {},
      messages: {
        1: {
          id: 1,
          subject: 'Hello',
          initiator: { player_id: 1, name: 'Me' },
          recipients: ['Elfie'],
          status: 'read',
          posts,
          created_at: '',
          updatedAt: 0,
        },
      },
    },
  });

  it('hides them, keeps them up to date, and restores them at the stage they had', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, stage: 'declined' }, T0);
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0 + DAY);
    expect(book.recruits['42'].removedAt).toBe(T0 + DAY);
    recordSighting(book, sighting({ at: T0 + 2 * DAY, chapter: 9 }), me);
    expect(book.recruits['42'].chapter).toBe(9);
    applyRecruitEdit(book, { playerId: 42, restore: true }, T0 + 3 * DAY);
    expect(book.recruits['42']).toMatchObject({ stage: 'declined' });
    expect(book.recruits['42'].removedAt).toBeUndefined();
  });

  it('brings back someone you had written to as Replied when they write after the removal', () => {
    const book = bookWith(sighting());
    syncFromMessages(book, threads(post(1, T0)), me);
    applyRecruitEdit(book, { playerId: 42, stage: 'dismissed' }, T0 + DAY);
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0 + DAY);
    syncFromMessages(book, threads(post(1, T0), post(42, T0 + 2 * DAY)), me);
    expect(book.recruits['42'].removedAt).toBeUndefined();
    expect(book.recruits['42'].stage).toBe('replied');
  });

  it('brings back someone never written to as New, and ignores what they wrote before the removal', () => {
    const book = bookWith(sighting());
    const theirs: MessagesData = {
      inbox: {
        overview: {},
        messages: {
          1: {
            id: 1,
            subject: 'Hi',
            initiator: { player_id: 42, name: 'Elfie' },
            status: 'read',
            posts: [post(42, T0)],
            created_at: '',
            updatedAt: 0,
          },
        },
      },
    };
    applyRecruitEdit(book, { playerId: 42, remove: true }, T0 + DAY);
    syncFromMessages(book, theirs, me);
    expect(book.recruits['42'].removedAt).toBe(T0 + DAY);
    theirs.inbox!.messages['1'].posts.push(post(42, T0 + 2 * DAY));
    syncFromMessages(book, theirs, me);
    expect(book.recruits['42'].removedAt).toBeUndefined();
    expect(book.recruits['42'].stage).toBe('new');
  });

  it('lifts the block on one removed before entries were kept when they write', () => {
    const book = emptyRecruitBook();
    book.removed = { 42: { at: T0 } };
    syncFromMessages(book, threads(post(1, T0 - DAY), post(42, T0 + DAY)), me);
    expect(book.removed['42']).toBeUndefined();
    expect(book.recruits['42']).toMatchObject({ stage: 'replied' });
  });

  it('is skipped by the score refresher', () => {
    const book = bookWith(sighting({ playerId: 2 }), sighting({ playerId: 3 }));
    applyRecruitEdit(book, { playerId: 2, remove: true }, T0);
    expect(nextScoreRefresh(book, T0 + DAY)?.playerId).toBe(3);
  });
});

describe('maybe defecting', () => {
  it('stays open whatever fellowship they are seen in, and joins when they reach yours', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, stage: 'defecting' }, T0);
    recordSighting(book, sighting({ at: T0 + DAY, guild: { id: 7, name: 'Others' } }), me);
    expect(book.recruits['42'].stage).toBe('defecting');
    recordSighting(book, sighting({ at: T0 + 2 * DAY }), me);
    expect(book.recruits['42'].stage).toBe('defecting');
    recordSighting(book, sighting({ at: T0 + 3 * DAY, guild: { id: 100 } }), me);
    expect(book.recruits['42'].stage).toBe('joined');
  });

  it('is still read by the score refresher', () => {
    const book = bookWith(sighting());
    applyRecruitEdit(book, { playerId: 42, stage: 'defecting' }, T0);
    expect(nextScoreRefresh(book, T0 + DAY)?.playerId).toBe(42);
  });
});

describe('last message', () => {
  it('is the newest post in a thread with them, theirs or yours', () => {
    const book = bookWith(sighting());
    const post = (playerId: number, at: number) => ({
      author: { player_id: playerId, name: 'x' },
      post: 'hi',
      created_at: at / 1000,
    });
    const data: MessagesData = {
      outbox: {
        overview: {},
        messages: {
          1: {
            id: 1,
            subject: 'Join us?',
            initiator: { player_id: 1, name: 'Me' },
            recipients: ['Elfie'],
            status: 'read',
            posts: [post(1, T0), post(42, T0 + DAY), post(1, T0 + 3 * DAY)],
            created_at: '',
            updatedAt: 0,
          },
        },
      },
    };
    syncFromMessages(book, data, me);
    expect(book.recruits['42'].lastMessageAt).toBe(T0 + 3 * DAY);
  });
});
