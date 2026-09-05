import {
  elvenStatsApiUrl,
  elvenStatsPlayerUrl,
  ElvenStatsShapeError,
  parseElvenStats,
  requestElvenStatsRefresh,
} from './elvenStats';
import {
  activitySigns,
  activityVerdict,
  clearDiagnostics,
  emptyRecruitBook,
  fellowshipProfile,
  Me,
  nextElvenStatsLookup,
  recordElvenStats,
  recordElvenStatsProblem,
  recordSighting,
} from './recruitBook';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 17, 9);
const me: Me = { playerId: 1, guildId: 100 };
const settings = { windowDays: 7, minSigns: 1 };

/** Trimmed from a real answer for en3/379333, with the fields the lookup reads. */
const answer = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    _id: '5aa8854b5f4587664334a504',
    username: 'billyboy11',
    playerId: 379333,
    rank: 209,
    fellowship: '',
    fellowshipId: 0,
    server: 'en3',
    currScore: 5686694,
    scoreHistory: [
      { date: '2018-03-14T02:13:31.411Z', day: '2018-03-14', score: 35734 },
      { date: '2026-10-05T08:00:00.000Z', day: '2026-10-05', score: 5600000 },
      { date: '2026-10-14T08:00:00.000Z', day: '2026-10-14', score: 5686694 },
    ],
    updatedDate: '2026-10-17T08:26:14.812Z',
    isActive: true,
    technologySection: 24,
    lastScoreChange: '2026-10-14T08:00:00.000Z',
    ...overrides,
  });

const candidateBook = () => {
  const book = emptyRecruitBook();
  recordSighting(
    book,
    { playerId: 379333, name: 'billyboy11', source: 'ranking', at: NOW - 30 * DAY, guild: null },
    me,
  );
  return book;
};

describe('elvenStats urls', () => {
  it('builds the page and the api address from the game world', () => {
    expect(elvenStatsPlayerUrl('en3', 379333)).toBe('https://www.elvenstats.com/player/en3/379333');
    expect(elvenStatsApiUrl('en3', 379333)).toBe('https://www.elvenstats.com/api/player/en3/379333');
  });
});

describe('parseElvenStats', () => {
  it('reads the fields the verdict uses and keeps only recent history', () => {
    const parsed = parseElvenStats(answer(), 379333, NOW);
    expect(parsed).toMatchObject({ name: 'billyboy11', chapter: 24, guild: null });
    expect(parsed.reading).toMatchObject({
      found: true,
      isActive: true,
      score: 5686694,
      updatedAt: Date.parse('2026-10-17T08:26:14.812Z'),
      lastScoreChange: Date.parse('2026-10-14T08:00:00.000Z'),
    });
    expect(parsed.reading.history).toHaveLength(2);
  });

  it('reads a fellowship', () => {
    expect(parseElvenStats(answer({ fellowship: 'Pyramaniacs', fellowshipId: 169 }), 379333, NOW).guild).toEqual({
      id: 169,
      name: 'Pyramaniacs',
    });
  });

  it('takes an empty answer for a player ElvenStats does not track', () => {
    expect(parseElvenStats('  ', 5, NOW).reading).toEqual({ checkedAt: NOW, found: false });
  });

  it.each([
    ['not JSON', '<html>'],
    ['another player', answer({ playerId: 2 })],
    ['no history', answer({ scoreHistory: undefined })],
    ['no scan date', answer({ updatedDate: 'yesterday' })],
    ['a list', '[]'],
  ])('refuses an answer with %s', (_, body) => {
    expect(() => parseElvenStats(body, 379333, NOW)).toThrow(ElvenStatsShapeError);
  });
});

describe('ElvenStats in the verdict', () => {
  const withAnswer = (overrides: Record<string, unknown> = {}) => {
    const book = candidateBook();
    const parsed = parseElvenStats(answer(overrides), 379333, NOW);
    recordElvenStats(book, 379333, parsed.reading, parsed, me);
    return book;
  };

  it('is active straight away when the score moved inside the window', () => {
    expect(activityVerdict(withAnswer().recruits['379333'], settings, NOW)).toBe('active');
  });

  it('is dormant when the score has not moved for the whole window', () => {
    const book = withAnswer({
      scoreHistory: [{ date: '2026-05-31T08:44:23.088Z', score: 5686694 }],
      lastScoreChange: '2026-05-31T08:44:23.088Z',
    });
    expect(activityVerdict(book.recruits['379333'], settings, NOW)).toBe('dormant');
  });

  it('is dormant when ElvenStats flags them inactive', () => {
    const book = withAnswer({ isActive: false, scoreHistory: [], lastScoreChange: undefined });
    expect(activityVerdict(book.recruits['379333'], settings, NOW)).toBe('dormant');
  });

  it('still trusts a scan from five days ago', () => {
    const book = withAnswer({
      isActive: false,
      scoreHistory: [],
      lastScoreChange: undefined,
      updatedDate: '2026-10-12T00:00:00.000Z',
    });
    expect(activityVerdict(book.recruits['379333'], settings, NOW)).toBe('dormant');
  });

  it('ignores a scan too old to speak for now', () => {
    const book = withAnswer({
      isActive: false,
      scoreHistory: [],
      lastScoreChange: undefined,
      updatedDate: '2026-10-01T00:00:00.000Z',
    });
    expect(activityVerdict(book.recruits['379333'], settings, NOW)).toBe('unclear');
  });

  it('takes their current score as an exact figure, dated to their check', () => {
    expect(withAnswer().recruits['379333'].exactScore).toEqual({
      at: Date.parse('2026-10-17T08:26:14.812Z'),
      score: 5686694,
      source: 'elvenstats',
    });
  });

  it('fills in the chapter and the fellowship', () => {
    const book = withAnswer({ fellowship: 'Pyramaniacs', fellowshipId: 169 });
    expect(book.recruits['379333']).toMatchObject({
      chapter: 24,
      stage: 'joinedElsewhere',
      sources: ['ranking', 'elvenstats'],
    });
  });

  it('lets a newer game sighting win over an older scan', () => {
    const book = withAnswer({ fellowship: 'Pyramaniacs', fellowshipId: 169, updatedDate: '2026-10-16T00:00:00.000Z' });
    recordSighting(book, { playerId: 379333, name: 'billyboy11', source: 'neighbour', at: NOW, guild: null }, me);
    expect(book.recruits['379333'].stage).toBe('new');
  });
});

describe('ElvenStats lookups', () => {
  it('picks the candidate asked about longest ago', () => {
    const book = candidateBook();
    recordSighting(book, { playerId: 7, name: 'b', source: 'ranking', at: NOW, guild: null }, me);
    const parsed = parseElvenStats(answer(), 379333, NOW);
    recordElvenStats(book, 379333, parsed.reading, parsed, me);
    expect(nextElvenStatsLookup(book, NOW - DAY)?.playerId).toBe(7);
  });

  it('stops on a problem, keeping the first reason, until cleared', () => {
    const book = emptyRecruitBook();
    recordElvenStatsProblem(book, { at: 1, where: 'ElvenStats', message: 'HTTP 500' });
    recordElvenStatsProblem(book, { at: 2, where: 'ElvenStats', message: 'HTTP 502' });
    expect(book.elvenStatsOff).toEqual({ at: 1, reason: 'ElvenStats: HTTP 500' });
    expect(book.scoreRefreshOff).toBeUndefined();
    clearDiagnostics(book);
    expect(book.elvenStatsOff).toBeUndefined();
  });
});

describe('ElvenStats changes either way, and what a stale scan can say', () => {
  /** Shaped like en3/366817 on 17/10: last scanned 4/10, the score dropping at each scan. */
  const dropping = {
    isActive: true,
    updatedDate: '2026-10-04T23:57:49.996Z',
    lastScoreChange: '2026-10-04T23:57:49.996Z',
    scoreHistory: [
      { date: '2026-09-27T00:00:00.000Z', score: 282215 },
      { date: '2026-10-04T00:00:00.000Z', score: 274413 },
    ],
  };
  const withAnswer = (overrides: Record<string, unknown>) => {
    const book = candidateBook();
    const parsed = parseElvenStats(answer(overrides), 379333, NOW);
    recordElvenStats(book, 379333, parsed.reading, parsed, me);
    return book.recruits['379333'];
  };

  it('counts a drop inside the window, even from a scan older than the freshness limit', () => {
    expect(activitySigns(withAnswer(dropping), { windowDays: 14, minSigns: 1 }, NOW)).toBe(1);
    expect(activityVerdict(withAnswer(dropping), { windowDays: 14, minSigns: 1 }, NOW)).toBe('active');
  });

  it('has nothing to say inside a shorter window, and does not call that dormant', () => {
    expect(activitySigns(withAnswer(dropping), settings, NOW)).toBe(0);
    expect(activityVerdict(withAnswer(dropping), settings, NOW)).toBe('unclear');
  });

  it('does not take a last change that is just the last scan as a quiet window', () => {
    const recent = {
      ...dropping,
      updatedDate: '2026-10-09T00:00:00.000Z',
      lastScoreChange: '2026-10-09T00:00:00.000Z',
    };
    expect(activityVerdict(withAnswer(recent), settings, NOW)).toBe('unclear');
  });

  it('is dormant once ElvenStats saw the score unchanged for a whole window', () => {
    const quiet = { ...dropping, updatedDate: '2026-10-15T00:00:00.000Z', lastScoreChange: '2026-10-04T00:00:00.000Z' };
    expect(activityVerdict(withAnswer(quiet), settings, NOW)).toBe('dormant');
  });
});

describe('an older ElvenStats check that saw a long quiet', () => {
  const withAnswer = (overrides: Record<string, unknown>) => {
    const book = candidateBook();
    const parsed = parseElvenStats(answer(overrides), 379333, NOW);
    recordElvenStats(book, 379333, parsed.reading, parsed, me);
    return book.recruits['379333'];
  };

  it('stays dormant when the quiet it saw outlasts the time since the check', () => {
    // Shaped like en3/268672: unchanged since September 2025, last checked 4/10.
    const recruit = withAnswer({
      isActive: false,
      updatedDate: '2026-10-04T23:58:01.181Z',
      lastScoreChange: '2025-09-21T17:24:42.431Z',
      scoreHistory: [
        { date: '2026-09-27T00:00:00.000Z', score: 150241 },
        { date: '2026-10-04T00:00:00.000Z', score: 150241 },
      ],
    });
    expect(activityVerdict(recruit, settings, NOW)).toBe('dormant');
  });

  it('is unclear when the quiet it saw is shorter than the time since the check', () => {
    const recruit = withAnswer({
      isActive: true,
      updatedDate: '2026-10-05T00:00:00.000Z',
      lastScoreChange: '2026-09-27T00:00:00.000Z',
      scoreHistory: [{ date: '2026-09-27T00:00:00.000Z', score: 150241 }],
    });
    expect(activityVerdict(recruit, settings, NOW)).toBe('unclear');
  });

  it('still gives way to a sign of our own', () => {
    const book = candidateBook();
    const parsed = parseElvenStats(
      answer({
        isActive: false,
        updatedDate: '2026-10-04T23:58:01.181Z',
        lastScoreChange: '2025-09-21T17:24:42.431Z',
        scoreHistory: [],
      }),
      379333,
      NOW,
    );
    recordElvenStats(book, 379333, parsed.reading, parsed, me);
    recordSighting(
      book,
      { playerId: 379333, name: 'b', source: 'ranking', at: NOW - 3 * DAY, score: 150241, guild: null },
      me,
    );
    recordSighting(
      book,
      { playerId: 379333, name: 'b', source: 'ranking', at: NOW - DAY, score: 150300, guild: null },
      me,
    );
    expect(activityVerdict(book.recruits['379333'], settings, NOW)).toBe('active');
  });
});

describe('requestElvenStatsRefresh', () => {
  const realFetch = global.fetch;
  const answerWith = (status: number, body: string) => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });
  };
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sends a PUT to the refresh endpoint and is satisfied with the refreshed record', async () => {
    answerWith(200, answer());
    await expect(requestElvenStatsRefresh('en3', 379333)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.elvenstats.com/api/player/en3/379333/refresh',
      expect.objectContaining({ method: 'PUT', credentials: 'omit' }),
    );
  });

  it('says so when ElvenStats no longer tracks the player', async () => {
    answerWith(200, JSON.stringify({ error: true, isIgnored: true }));
    await expect(requestElvenStatsRefresh('en3', 1)).resolves.toBe('ElvenStats no longer tracks this player');
  });

  it('passes on any other refusal', async () => {
    answerWith(200, JSON.stringify({ error: 'busy', message: 'Try again later' }));
    await expect(requestElvenStatsRefresh('en3', 1)).resolves.toBe('ElvenStats could not refresh: Try again later');
  });

  it('takes their 404 for an unknown player as an answer, not a failure', async () => {
    answerWith(404, JSON.stringify({ status: 'error', message: 'Unable to find user with that id' }));
    await expect(requestElvenStatsRefresh('en3', 5)).resolves.toBe("ElvenStats doesn't know this player");
  });

  it('throws on an HTTP error or an answer that is not JSON', async () => {
    answerWith(500, 'oops');
    await expect(requestElvenStatsRefresh('en3', 1)).rejects.toThrow('HTTP 500');
    answerWith(200, '<html>');
    await expect(requestElvenStatsRefresh('en3', 1)).rejects.toThrow('not JSON');
  });
});

describe('fellowship history', () => {
  const read = (overrides: Record<string, unknown>) => parseElvenStats(answer(overrides), 379333, NOW).reading;
  /** A candidate holding this reading, last seen by the game without a fellowship at `seenOutAt`. */
  const holding = (reading: ReturnType<typeof read>, seenOutAt = NOW - 30 * DAY) => {
    const book = candidateBook();
    const recruit = book.recruits['379333'];
    recruit.elvenStats = reading;
    recruit.guildCheckedAt = seenOutAt;
    return recruit;
  };

  it('reads the changes, oldest first, with leaving as no id', () => {
    // Shaped like en3/268672.
    const reading = read({
      createdAt: '2018-03-14T02:13:50.303Z',
      fellowshipHistory: [
        { name: 'valentines', fellowshipId: 31741, date: '2025-02-17T01:38:15.778Z' },
        { name: 'Farmers', fellowshipId: 6636, date: '2018-03-14T02:13:50.303Z' },
        { name: null, fellowshipId: null, date: '2025-12-22T01:31:18.245Z' },
      ],
    });
    expect(reading.trackedSince).toBe(Date.parse('2018-03-14T02:13:50.303Z'));
    expect(reading.fellowships).toEqual([
      { at: Date.parse('2018-03-14T02:13:50.303Z'), id: 6636, name: 'Farmers' },
      { at: Date.parse('2025-02-17T01:38:15.778Z'), id: 31741, name: 'valentines' },
      { at: Date.parse('2025-12-22T01:31:18.245Z'), id: undefined, name: undefined },
    ]);
    expect(fellowshipProfile(holding(reading), NOW)).toEqual({
      kind: 'left',
      at: Date.parse('2025-12-22T01:31:18.245Z'),
      memberUntil: Date.parse('2025-12-22T01:31:18.245Z'),
      recently: false,
      count: 2,
      lastName: 'valentines',
    });
  });

  it('does not call anyone solo on less than a year of tracking', () => {
    const reading = read({ createdAt: '2026-06-01T00:00:00.000Z', fellowshipHistory: [] });
    expect(fellowshipProfile(holding(reading), NOW)).toBeUndefined();
  });

  it('calls someone never in a fellowship solo, since they were first tracked', () => {
    const reading = read({ createdAt: '2022-04-10T18:22:24.486Z', fellowshipHistory: [] });
    expect(fellowshipProfile(holding(reading), NOW)).toEqual({
      kind: 'solo',
      since: Date.parse('2022-04-10T18:22:24.486Z'),
    });
  });

  it('marks a recent leaver', () => {
    const reading = read({
      fellowshipHistory: [
        { name: 'A', fellowshipId: 1, date: '2026-01-01T00:00:00.000Z' },
        { name: null, fellowshipId: null, date: '2026-09-30T00:00:00.000Z' },
      ],
    });
    expect(fellowshipProfile(holding(reading), NOW)).toMatchObject({ kind: 'left', recently: true });
  });

  it('takes a member by ElvenStats whom the game has since seen out of it as having left between the two', () => {
    // Shaped like en3/366817: in Kingdom of Alvina at the 4/10 check, seen guildless since.
    const reading = read({
      updatedDate: '2026-10-04T23:57:49.996Z',
      fellowshipHistory: [
        { name: 'Nettle patch', fellowshipId: 31352, date: '2024-10-01T10:43:42.871Z' },
        { name: 'Kingdom of Alvina', fellowshipId: 31237, date: '2026-01-04T19:35:27.177Z' },
      ],
    });
    expect(fellowshipProfile(holding(reading, NOW - DAY), NOW)).toEqual({
      kind: 'left',
      at: NOW - DAY,
      memberUntil: Date.parse('2026-10-04T23:57:49.996Z'),
      recently: true,
      count: 2,
      lastName: 'Kingdom of Alvina',
    });
    // Seen out of it only before that check: still a member as far as anyone knows.
    expect(fellowshipProfile(holding(reading, Date.parse('2026-09-01T00:00:00.000Z')), NOW)).toEqual({
      kind: 'member',
      count: 2,
    });
  });

  it('says nothing without a history', () => {
    const unseen = candidateBook().recruits['379333'];
    delete unseen.guildCheckedAt;
    unseen.fellowshipChanges = [];
    expect(fellowshipProfile(unseen, NOW)).toBeUndefined();
  });
});
