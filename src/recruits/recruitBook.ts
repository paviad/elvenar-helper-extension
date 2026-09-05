import { GameMessage, MessagesData } from '../model/gameMessage';

/**
 * Candidate recruits for the fellowship: players we have come across who are past chapter 4 and
 * in no fellowship, with what we have seen of them since so their activity can be judged, and how
 * far recruiting each one has got.
 *
 * Kept apart from the account record, under its own storage key, because the account is already
 * large and is written after nearly every game response; this changes far less often.
 */

/** Chapter 5 on. Below it a player is not worth the approach yet. */
export const MIN_RECRUIT_CHAPTER = 5;

/**
 * A score above this is only reached from chapter 5 on, so it settles the chapter question when
 * nothing has shown the chapter itself. A lower score settles nothing either way.
 */
export const SCORE_IMPLIES_MIN_CHAPTER = 100_000;

/**
 * The candidate's highest score of any kind. The lookup's sum leaves parts of the ranking points
 * out, so a later sum can read well below an earlier ranking figure; the highest is the one that
 * says most about how far they have got.
 */
export const highestScore = (recruit: Recruit) =>
  recruit.scores.length ? Math.max(...recruit.scores.map((s) => s.score)) : undefined;

/**
 * Whether the candidate is known to be past the chapter bar: from their chapter where it has been
 * seen, otherwise from a score above {@link SCORE_IMPLIES_MIN_CHAPTER}. `undefined` is not known.
 */
export const chapterStatus = (recruit: Recruit): 'exact' | 'byScore' | undefined =>
  recruit.chapter !== undefined
    ? 'exact'
    : (highestScore(recruit) ?? 0) > SCORE_IMPLIES_MIN_CHAPTER
      ? 'byScore'
      : undefined;

/** Score readings kept per candidate. Only changes are stored, so this is a long history. */
export const MAX_SCORE_SNAPSHOTS = 30;

/** Moments of activity kept per candidate, newest last. */
export const MAX_ACTIVITY_MOMENTS = 40;

export type RecruitSource =
  'neighbour' | 'visit' | 'ranking' | 'wonder' | 'message' | 'profile' | 'elvenstats' | 'trade';

/**
 * Where recruiting stands. `joined` and `joinedElsewhere` are set from what the game shows;
 * `contacted` and `replied` from the message threads. `gone` is set when the score lookup finds
 * them in no ranking at all, and undone when the game shows them again; `formerMember` when someone
 * who left your fellowship turns up. `defecting` - talks under way with someone still in another
 * fellowship - is set by hand, like the rest, and is never closed for the fellowship they are in.
 */
export type RecruitStage =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'defecting'
  | 'joined'
  | 'declined'
  | 'joinedElsewhere'
  | 'dismissed'
  | 'gone'
  | 'formerMember';

/** The stages still being worked, which are the ones the score refresher keeps current. */
export const OPEN_STAGES: readonly RecruitStage[] = ['new', 'contacted', 'replied', 'defecting'];

/**
 * Where a score came from. Ranking pages give the ranking points themselves. (A visit's player
 * record has a `score` field too, but the server leaves it empty in practice.) The score lookup gives only four of the parts they are made of (wonders, culture, encounters, population),
 * summed here; the wonder ranking effect and tournaments are left out, so the sum reads lower. It
 * is still good for spotting change. The two are kept apart and only ever compared with their own
 * kind, so the gap between them can never pass for a change of score.
 */
export type ScoreKind = 'overview';

export interface ScoreSnapshot {
  at: number;
  score: number;
  /** Absent for ranking points. */
  kind?: ScoreKind;
}

/** The reading before `index` of the same kind, if any. */
const previousOfKind = (scores: ScoreSnapshot[], index: number) => {
  for (let i = index - 1; i >= 0; i--) {
    if (scores[i].kind === scores[index].kind) {
      return scores[i];
    }
  }
  return undefined;
};

/**
 * What ElvenStats knew about a candidate when we asked. They scan cities every few hours and keep
 * the whole score history, so this settles activity straight away where our own readings need
 * days. Only what the verdict and the list use is kept.
 */
export interface ElvenStatsReading {
  /** When we asked. */
  checkedAt: number;
  /** False when ElvenStats does not track the player at all. */
  found: boolean;
  /** When ElvenStats last scanned them. */
  updatedAt?: number;
  /** Their own inactivity flag, the warning sign on the player page. */
  isActive?: boolean;
  /** When their score last moved, as ElvenStats saw it. */
  lastScoreChange?: number;
  score?: number;
  /** The last {@link ELVENSTATS_HISTORY_DAYS} days of their score history, oldest first. */
  history?: ScoreSnapshot[];
  /** When ElvenStats started tracking them, which is how far back `fellowships` goes. */
  trackedSince?: number;
  /**
   * Their fellowship changes as ElvenStats saw them, oldest first: joining one (with its id and
   * name) or leaving to none (without). Seen at their checks, so a stay of a few days can be missed.
   */
  fellowships?: FellowshipChange[];
}

export interface FellowshipChange {
  at: number;
  /** Absent when they left to no fellowship. */
  id?: number;
  name?: string;
}

/** How many fellowship changes are kept: enough for years of anyone's history. */
export const MAX_FELLOWSHIP_CHANGES = 30;

/** How long ElvenStats must have watched someone without a fellowship before they count as solo. */
export const SOLO_EVIDENCE_MS = 365 * 24 * 60 * 60 * 1000;

/** Leaving a fellowship this recently makes a player worth reaching first. */
export const RECENTLY_LEFT_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * What ElvenStats' fellowship history says about how a player plays, as far back as it goes:
 * - `solo`: never in a fellowship since they were first tracked - used to playing alone, and likely
 *   used to turning invitations down.
 * - `left`: out of a fellowship now, having been in one; `recently` when within RECENTLY_LEFT_MS,
 *   the best time to reach them.
 * - `member`: in one at ElvenStats' last check.
 */
export type FellowshipProfile =
  | { kind: 'solo'; since?: number }
  | {
      kind: 'left';
      /** When they were first seen out of a fellowship, after last being in one. */
      at: number;
      /** The last time anyone saw them still in one: they left somewhere between this and `at`. */
      memberUntil: number;
      recently: boolean;
      count: number;
      lastName?: string;
    }
  | { kind: 'member'; count: number };

/** Where a point on the fellowship timeline came from. */
export type FellowshipSource = 'elvenstats' | 'game';

export interface FellowshipTimelineEntry extends FellowshipChange {
  source: FellowshipSource;
  /**
   * A change seen happening - in ElvenStats' history or ours - which dates it to within one check.
   * Otherwise a "last seen" point, which only says what that side knew by then.
   */
  recorded: boolean;
}

/**
 * Everything known about where they have been, as dated points, oldest first: ElvenStats' history
 * and its last check, our own recorded changes and the last time the game showed their fellowship.
 * The two "last seen" points say what each side knew most recently, so a candidate recorded before
 * we kept a history of our own still lands right.
 */
const fellowshipPoints = (recruit: Recruit): FellowshipTimelineEntry[] => {
  const points: FellowshipTimelineEntry[] = [];
  const reading = recruit.elvenStats?.found ? recruit.elvenStats : undefined;
  const theirs = reading?.fellowships ?? [];
  points.push(...theirs.map((c) => ({ ...c, source: 'elvenstats' as const, recorded: true })));
  if (reading?.updatedAt !== undefined && theirs.length > 0) {
    const last = theirs[theirs.length - 1];
    points.push({ at: reading.updatedAt, id: last.id, name: last.name, source: 'elvenstats', recorded: false });
  }
  points.push(...(recruit.fellowshipChanges ?? []).map((c) => ({ ...c, source: 'game' as const, recorded: true })));
  if (recruit.guildCheckedAt !== undefined) {
    points.push({
      at: recruit.guildCheckedAt,
      id: recruit.guild?.id,
      name: recruit.guild?.name,
      source: 'game',
      recorded: false,
    });
  }
  return points.sort((a, b) => a.at - b.at);
};

/** The fellowship timeline for showing: the points, keeping only where the fellowship changed. */
export const fellowshipTimeline = (recruit: Recruit): FellowshipTimelineEntry[] =>
  fellowshipPoints(recruit).filter((point, i, all) => i === 0 || point.id !== all[i - 1].id);

/**
 * What the fellowship timeline says about how a player plays:
 * - `solo`: never in a fellowship in at least SOLO_EVIDENCE_MS of ElvenStats tracking them - used to
 *   playing alone, and likely used to turning invitations down. A definite call: shorter tracking,
 *   or our own sightings alone, never make it.
 * - `left`: out of one now, having been in one; `recently` when the last time they were seen in it
 *   is within RECENTLY_LEFT_MS, the best time to reach them.
 * - `member`: in one, by the newest of what anyone has seen.
 */
export const fellowshipProfile = (recruit: Recruit, now: number): FellowshipProfile | undefined => {
  const points = fellowshipPoints(recruit);
  const timeline = fellowshipTimeline(recruit);
  if (timeline.length === 0) {
    return undefined;
  }
  const members = points.filter((p) => p.id !== undefined);
  if (members.length === 0) {
    // A definite call, so only on long evidence: ElvenStats watching them for a year or more without
    // one fellowship, and nothing of ours to the contrary. Anything shorter says nothing either way.
    const since =
      recruit.elvenStats?.found && recruit.elvenStats.fellowships ? recruit.elvenStats.trackedSince : undefined;
    return since !== undefined && now - since >= SOLO_EVIDENCE_MS ? { kind: 'solo', since } : undefined;
  }
  const count = new Set(members.map((p) => p.id)).size;
  const last = timeline[timeline.length - 1];
  if (last.id !== undefined) {
    return { kind: 'member', count };
  }
  const before = members.filter((p) => p.at < last.at);
  const lastMember = before[before.length - 1];
  // A leaving seen happening is dated by that; one only inferred from a later "last seen" is known
  // only to fall after the last time anyone saw them still in the fellowship.
  const memberUntil = last.recorded ? last.at : lastMember.at;
  return {
    kind: 'left',
    at: last.at,
    memberUntil,
    recently: now - memberUntil < RECENTLY_LEFT_MS,
    count,
    lastName: lastMember.name,
  };
};

/** How many of our own fellowship changes are kept per candidate. */
export const MAX_OWN_FELLOWSHIP_CHANGES = 30;

/** Records a fellowship change the game showed us, or the first fellowship (or none) we saw. */
const noteFellowshipChange = (recruit: Recruit, change: FellowshipChange) => {
  const changes = (recruit.fellowshipChanges ??= []);
  changes.push(change);
  if (changes.length > MAX_OWN_FELLOWSHIP_CHANGES) {
    changes.splice(0, changes.length - MAX_OWN_FELLOWSHIP_CHANGES);
  }
};

/** How much of the ElvenStats score history is kept. */
export const ELVENSTATS_HISTORY_DAYS = 35;

/** An ElvenStats scan older than this says nothing about now, and is left out of the verdict. */
export const ELVENSTATS_FRESH_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * What they did. `other` is a moment kept before the kind was recorded, so what it was is lost.
 */
export type ActivityKind = 'message' | 'help' | 'wonderKp' | 'trade' | 'tradeOffer' | 'notification' | 'other';

export interface ActivityMoment {
  at: number;
  kind: ActivityKind;
  /** A few words on it: the thread's subject, the wonder and how much went in, and so on. */
  detail?: string;
  /**
   * What it was, for something seen again and again that must count once - a trade offer, by its
   * id, stays on the market for days and is read each time the market is opened.
   */
  ref?: string;
}

/**
 * Where an exact score came from: a ranking page or ElvenStats in practice. `visit` stays for the
 * day a visit's answer carries the score its definition allows for; it does not today.
 */
export type ExactScoreSource = 'ranking' | 'visit' | 'elvenstats';

export interface ExactScore {
  at: number;
  score: number;
  source: ExactScoreSource;
}

/** Keeps `candidate` as the exact score when nothing newer is already held. */
const noteExactScore = (recruit: Recruit, candidate: ExactScore) => {
  if (!recruit.exactScore || candidate.at >= recruit.exactScore.at) {
    recruit.exactScore = candidate;
  }
};

export interface Recruit {
  playerId: number;
  name: string;
  /** Exact, from the world map or a visit. Absent until one of those has shown it. */
  chapter?: number;
  /** The fellowship last seen. Absent means none, once `guildCheckedAt` says we have looked. */
  guild?: { id: number; name?: string };
  guildCheckedAt?: number;
  firstSeen: number;
  lastSeen: number;
  sources: RecruitSource[];
  /** Score readings, appended only when the score has moved. */
  scores: ScoreSnapshot[];
  /** When the score was last read, moved or not, so an unchanged score still counts as watched. */
  scoreCheckedAt?: number;
  /** Moments they were seen doing something themselves: writing to you, helping you, and so on. */
  activity: ActivityMoment[];
  /** The game's own `is_active`, from a visit. Only `false` is telling. */
  isActive?: boolean;
  stage: RecruitStage;
  stageAt: number;
  contactedAt?: number;
  repliedAt?: number;
  /** The newest post in a private thread with them, theirs or yours. */
  lastMessageAt?: number;
  notes?: string;
  elvenStats?: ElvenStatsReading;
  /**
   * The latest exact score, whatever it was - unlike `scores`, which keeps a reading only when it has
   * moved, and so cannot say which figure is the newest when an exact one repeats an earlier one.
   */
  exactScore?: ExactScore;
  /**
   * When they were removed from the list by hand. They are hidden, not deleted: kept up to date
   * from every source, listed under Removed in Closed, and restored by hand, by writing to you, or
   * by leaving a fellowship.
   */
  removedAt?: number;
  /** The last time a source showed them in a fellowship since their removal, or at it. */
  removedInFellowshipAt?: number;
  /**
   * When the score lookup last answered that they are in no ranking at all - a deleted, reset or
   * banned account, or one too new to be ranked. Cleared once a score is seen again.
   */
  unrankedAt?: number;
  /**
   * Fellowship changes the game has shown us, oldest first: the first fellowship (or none) we saw,
   * then each join, leave or switch. ElvenStats' own history is kept apart, in `elvenStats`.
   */
  fellowshipChanges?: FellowshipChange[];
}

/** Something that went wrong, kept so it can be read off the Diagnostics tab and reported. */
export interface RecruitDiagnostic {
  at: number;
  /** Which part went wrong, e.g. `score lookup (page)`. */
  where: string;
  message: string;
  /** What there was to see: the error's stack, or the answer that did not fit. */
  detail?: string;
}

/** Diagnostics kept, newest last. */
export const MAX_DIAGNOSTICS = 30;

export interface RecruitBook {
  recruits: Record<string, Recruit>;
  /** Who is in your fellowship, from startup data, so they are never taken for candidates. */
  myGuild?: { id: number; memberIds: number[] };
  /**
   * Everyone ever seen on your fellowship's member list, kept across startups: today's list no
   * longer names those who left, and they are not recruits to chase - see `formerMember`.
   */
  everMemberIds?: number[];
  diagnostics?: RecruitDiagnostic[];
  /**
   * Set when the score lookup went wrong. The refresher sends nothing more until the
   * diagnostics are cleared by hand: a request we do not understand is not one to keep sending.
   */
  scoreRefreshOff?: { at: number; reason: string };
  /** The same for the ElvenStats lookups: set on the first problem, cleared by hand. */
  elvenStatsOff?: { at: number; reason: string };
  /** The game world, as ElvenStats names servers (`en3`), from the session the book was last fed by. */
  server?: string;
  /** Players removed from the list by hand, by id. See {@link RemovedPlayer}. */
  removed?: Record<string, RemovedPlayer>;
  /**
   * How the score lookup has fared: answers counted since `since`, and when the last one came. Kept
   * so a lookup that went unanswered can be weighed against how many did not.
   */
  scoreLookups?: { answered: number; since: number; lastAnsweredAt?: number };
}

/**
 * Someone removed from the list by hand before removal kept the entry - only the id is left.
 * Every source would otherwise bring them straight back
 * the next time they turned up, so they stay off it - until they are seen out of a fellowship
 * after last being seen in one: having left, they are worth another look.
 */
export interface RemovedPlayer {
  at: number;
  /** The last time a source showed them in a fellowship, at removal or since. */
  inFellowshipAt?: number;
}

export const emptyRecruitBook = (): RecruitBook => ({ recruits: {} });

/** You, as far as the book needs to know. */
export interface Me {
  playerId?: number;
  guildId?: number;
}

/**
 * One time a player was seen somewhere. `guild` is `null` when the source showed them in no
 * fellowship, and left out when the source does not say.
 */
export interface Sighting {
  playerId: number;
  name: string;
  source: RecruitSource;
  at: number;
  chapter?: number;
  guild?: { id: number; name?: string } | null;
  score?: number;
  scoreKind?: ScoreKind;
  isActive?: boolean;
}

const isMyGuildMember = (book: RecruitBook, playerId: number) => book.myGuild?.memberIds.includes(playerId) ?? false;

const setStage = (recruit: Recruit, stage: RecruitStage, at: number) => {
  if (recruit.stage !== stage) {
    recruit.stage = stage;
    recruit.stageAt = at;
  }
};

/** Records a score reading, keeping a new snapshot only when the score of that kind has moved. */
const recordScore = (recruit: Recruit, score: number, at: number, kind: ScoreKind | undefined) => {
  recruit.scoreCheckedAt = Math.max(recruit.scoreCheckedAt ?? 0, at);
  const last = [...recruit.scores].reverse().find((s) => s.kind === kind);
  if (last && (last.score === score || last.at > at)) {
    return;
  }
  recruit.scores.push(kind ? { score, at, kind } : { score, at });
  if (recruit.scores.length > MAX_SCORE_SNAPSHOTS) {
    recruit.scores.splice(0, recruit.scores.length - MAX_SCORE_SNAPSHOTS);
  }
};

export const recordActivity = (recruit: Recruit, moment: ActivityMoment) => {
  const seen = recruit.activity.some((m) =>
    moment.ref !== undefined ? m.ref === moment.ref : m.at === moment.at && m.kind === moment.kind,
  );
  if (seen) {
    return;
  }
  recruit.activity.push(moment);
  recruit.activity.sort((a, b) => a.at - b.at);
  if (recruit.activity.length > MAX_ACTIVITY_MOMENTS) {
    recruit.activity.splice(0, recruit.activity.length - MAX_ACTIVITY_MOMENTS);
  }
};

/**
 * Whether a sighting is enough to start tracking someone. Only a source that showed them in no
 * fellowship qualifies, plus a message: a stranger writing to you is a lead even though the
 * thread does not say which fellowship they are in. Anyone shown below chapter 5 is passed over.
 */
/**
 * Whether a sighting lets a removed player back on: only seeing them out of a fellowship later than
 * they were last seen in one. Anything else keeps them off, noting a fellowship if it shows one.
 */
const releasesRemoved = (book: RecruitBook, sighting: Sighting) => {
  const key = String(sighting.playerId);
  const removed = book.removed?.[key];
  if (!removed) {
    return true;
  }
  if (sighting.guild) {
    removed.inFellowshipAt = Math.max(removed.inFellowshipAt ?? 0, sighting.at);
    return false;
  }
  if (sighting.guild === null && removed.inFellowshipAt !== undefined && sighting.at > removed.inFellowshipAt) {
    delete book.removed![key];
    return true;
  }
  return false;
};

const startsTracking = (book: RecruitBook, sighting: Sighting, me: Me) => {
  if (sighting.playerId === me.playerId || isMyGuildMember(book, sighting.playerId)) {
    return false;
  }
  if (!releasesRemoved(book, sighting)) {
    return false;
  }
  if (sighting.chapter !== undefined && sighting.chapter < MIN_RECRUIT_CHAPTER) {
    return false;
  }
  return sighting.guild === null || (sighting.guild === undefined && sighting.source === 'message');
};

/**
 * Folds one sighting into the book: starts tracking a new candidate, or brings a known one up to
 * date. Someone seen in a fellowship moves to `joined` when it is yours and `joinedElsewhere`
 * otherwise; seen out of it again, a `joinedElsewhere` goes back to `new`.
 */
export const recordSighting = (book: RecruitBook, sighting: Sighting, me: Me) => {
  if (!isRealPlayer(sighting.playerId)) {
    return;
  }
  const key = String(sighting.playerId);
  let recruit = book.recruits[key];
  const { at } = sighting;

  if (!recruit) {
    if (!startsTracking(book, sighting, me)) {
      return;
    }
    recruit = {
      playerId: sighting.playerId,
      name: sighting.name,
      firstSeen: at,
      lastSeen: at,
      sources: [],
      scores: [],
      activity: [],
      stage: 'new',
      stageAt: at,
    };
    book.recruits[key] = recruit;
  }

  if (sighting.name) {
    recruit.name = sighting.name;
  }
  recruit.lastSeen = Math.max(recruit.lastSeen, at);
  if (!recruit.sources.includes(sighting.source)) {
    recruit.sources.push(sighting.source);
  }
  if (sighting.chapter !== undefined) {
    recruit.chapter = Math.max(recruit.chapter ?? 0, sighting.chapter);
  }
  if (sighting.isActive !== undefined) {
    recruit.isActive = sighting.isActive;
  }
  // Seen by the game since they dropped out of the rankings: they are back. Not ElvenStats, which
  // can go on showing a deleted account it has not caught up with.
  if (recruit.unrankedAt !== undefined && at > recruit.unrankedAt && sighting.source !== 'elvenstats') {
    delete recruit.unrankedAt;
    if (recruit.stage === 'gone') {
      setStage(recruit, 'new', at);
    }
  }
  // Removed by hand: they come back once seen out of a fellowship after last being seen in one.
  if (recruit.removedAt !== undefined) {
    if (sighting.guild) {
      recruit.removedInFellowshipAt = Math.max(recruit.removedInFellowshipAt ?? 0, at);
    } else if (
      sighting.guild === null &&
      recruit.removedInFellowshipAt !== undefined &&
      at > recruit.removedInFellowshipAt
    ) {
      restoreRecruit(recruit);
    }
  }
  if (sighting.score !== undefined) {
    recordScore(recruit, sighting.score, at, sighting.scoreKind);
    // Ranking pages give the ranking points themselves (a visit would too, if it ever sent them);
    // the score lookup only a sum.
    if (sighting.scoreKind === undefined) {
      noteExactScore(recruit, { at, score: sighting.score, source: sighting.source === 'visit' ? 'visit' : 'ranking' });
    }
  }

  if (sighting.guild !== undefined && at >= (recruit.guildCheckedAt ?? 0)) {
    const firstLook = recruit.guildCheckedAt === undefined;
    const changed = firstLook || recruit.guild?.id !== (sighting.guild?.id ?? undefined);
    // ElvenStats' changes are in its own history; this records only what the game showed.
    if (changed && sighting.source !== 'elvenstats') {
      noteFellowshipChange(
        recruit,
        sighting.guild
          ? { at, id: sighting.guild.id, name: sighting.guild.name || undefined }
          : { at, id: undefined, name: undefined },
      );
    }
    recruit.guildCheckedAt = at;
    if (sighting.guild) {
      recruit.guild = { id: sighting.guild.id, name: sighting.guild.name || recruit.guild?.name };
      if (sighting.guild.id === me.guildId) {
        setStage(recruit, 'joined', at);
      } else if (recruit.stage !== 'joined' && recruit.stage !== 'defecting') {
        // Not for someone you are talking round: they are expected to be in a fellowship still.
        setStage(recruit, 'joinedElsewhere', at);
      }
    } else {
      delete recruit.guild;
      if (recruit.stage === 'joinedElsewhere') {
        setStage(recruit, 'new', at);
      }
    }
  }
  closeFormerMember(book, recruit, at);
};

/**
 * Whether they were ever in your fellowship: on its member list at some startup, or in it by our
 * fellowship history or ElvenStats'.
 */
const wasMyMember = (book: RecruitBook, recruit: Recruit) => {
  if (book.everMemberIds?.includes(recruit.playerId)) {
    return true;
  }
  const myGuildId = book.myGuild?.id;
  if (myGuildId === undefined) {
    return false;
  }
  const histories = [...(recruit.fellowshipChanges ?? []), ...(recruit.elvenStats?.fellowships ?? [])];
  return histories.some((change) => change.id === myGuildId);
};

/**
 * Someone who left your fellowship is no recruit to chase: you know them, and likely parted for a
 * reason. Seen outside it, a candidate nobody has done anything with yet - or one who had joined -
 * goes straight to `formerMember`. A stage set by hand, or a conversation under way, is left alone.
 */
const closeFormerMember = (book: RecruitBook, recruit: Recruit, at: number) => {
  if (
    (recruit.stage === 'new' || recruit.stage === 'joined') &&
    recruit.guild?.id !== book.myGuild?.id &&
    wasMyMember(book, recruit)
  ) {
    setStage(recruit, 'formerMember', at);
  }
};

/**
 * Takes in your fellowship's member list from startup data. Candidates now on it have joined;
 * the list itself keeps your fellowship mates out of the book from here on.
 */
export const recordMyGuild = (book: RecruitBook, guild: { id: number; memberIds: number[] }, at: number) => {
  book.myGuild = guild;
  book.everMemberIds = [...new Set([...(book.everMemberIds ?? []), ...guild.memberIds])];
  // Recruits who had joined and are no longer on the list have left.
  for (const recruit of Object.values(book.recruits)) {
    if (recruit.stage === 'joined' && !guild.memberIds.includes(recruit.playerId)) {
      delete recruit.guild;
      recruit.guildCheckedAt = at;
      closeFormerMember(book, recruit, at);
    }
  }
  for (const memberId of guild.memberIds) {
    const recruit = book.recruits[String(memberId)];
    if (recruit) {
      recruit.guild = { id: guild.id, name: recruit.guild?.name };
      recruit.guildCheckedAt = at;
      setStage(recruit, 'joined', at);
    }
  }
};

/** The private threads (not fellowship ones) that someone took part in, by player id or name. */
const involves = (message: GameMessage, recruit: Recruit) =>
  message.initiator?.player_id === recruit.playerId ||
  message.posts?.some((post) => post.author?.player_id === recruit.playerId) ||
  (message.recipients?.includes(recruit.name) ?? false);

const allThreads = (messagesData: MessagesData | undefined) =>
  [messagesData?.inbox, messagesData?.outbox]
    .flatMap((folder) => Object.values(folder?.messages ?? {}))
    .filter((message) => message.guildId === undefined && !message.guild);

/**
 * Reads the private message threads for recruiting progress. Strangers who wrote to you are
 * added as candidates. For each candidate, your first post in a thread with them is when they
 * were contacted, their first post after it is when they replied, and every post of theirs is a
 * moment of activity. Stages only move forward from here; nothing set by hand is undone.
 */
export const syncFromMessages = (book: RecruitBook, messagesData: MessagesData | undefined, me: Me) => {
  const threads = allThreads(messagesData);

  // Removed before removal kept the entry: a post of theirs since then lifts the block, and they
  // are added again below like anyone else who writes.
  for (const thread of threads) {
    for (const post of thread.posts ?? []) {
      const author = post.author;
      const key = author ? String(author.player_id) : undefined;
      const removed = key ? book.removed?.[key] : undefined;
      if (author && key && removed && post.created_at * 1000 > removed.at && author.player_id !== me.playerId) {
        delete book.removed![key];
        recordSighting(
          book,
          { playerId: author.player_id, name: author.name, source: 'message', at: post.created_at * 1000 },
          me,
        );
      }
    }
  }

  for (const thread of threads) {
    const initiator = thread.initiator;
    if (!initiator || initiator.player_id === me.playerId) {
      continue;
    }
    const firstPost = thread.posts?.[0];
    recordSighting(
      book,
      {
        playerId: initiator.player_id,
        name: initiator.name,
        source: 'message',
        at: firstPost ? firstPost.created_at * 1000 : thread.updatedAt * 1000,
      },
      me,
    );
  }

  for (const recruit of Object.values(book.recruits)) {
    const mine: number[] = [];
    const theirs: number[] = [];
    for (const thread of threads.filter((t) => involves(t, recruit))) {
      for (const post of thread.posts ?? []) {
        const at = post.created_at * 1000;
        if (post.author?.player_id === me.playerId) {
          mine.push(at);
        } else if (post.author?.player_id === recruit.playerId) {
          theirs.push(at);
          recordActivity(recruit, { at, kind: 'message', detail: thread.subject || undefined });
          recruit.lastSeen = Math.max(recruit.lastSeen, at);
        }
      }
    }

    const newest = Math.max(...mine, ...theirs);
    if (Number.isFinite(newest)) {
      recruit.lastMessageAt = Math.max(recruit.lastMessageAt ?? 0, newest);
    }

    // Writing to you after being removed brings them back: Replied if you had written to them,
    // New if not - whatever stage they had been left at.
    const removedAt = recruit.removedAt;
    const restoredBy = removedAt === undefined ? [] : theirs.filter((at) => at > removedAt);
    if (restoredBy.length > 0) {
      restoreRecruit(recruit);
      if (mine.length === 0) {
        setStage(recruit, 'new', Math.min(...restoredBy));
      }
    }

    if (mine.length === 0) {
      continue;
    }
    const contactedAt = Math.min(...mine);
    recruit.contactedAt = Math.min(recruit.contactedAt ?? contactedAt, contactedAt);
    const replies = theirs.filter((at) => at > recruit.contactedAt!);
    if (replies.length > 0) {
      recruit.repliedAt = Math.min(...replies);
    }

    if (recruit.stage === 'new') {
      setStage(recruit, 'contacted', recruit.contactedAt);
    }
    if ((recruit.stage === 'new' || recruit.stage === 'contacted') && recruit.repliedAt) {
      setStage(recruit, 'replied', recruit.repliedAt);
    }
    if (restoredBy.length > 0) {
      setStage(recruit, 'replied', Math.min(...restoredBy));
    }
  }
};

/**
 * Players have positive ids. The game's own senders - the system mail behind event and team
 * messages - carry negative ones, and are nobody to recruit.
 */
export const isRealPlayer = (playerId: number) => Number.isInteger(playerId) && playerId > 0;

/**
 * Drops anything that is not a real player, from before that was checked. Nothing else is ever
 * dropped: the book has no size limit, so no candidate is lost to make room for another.
 */
export const pruneRecruitBook = (book: RecruitBook) => {
  for (const [key, recruit] of Object.entries(book.recruits)) {
    if (!isRealPlayer(recruit.playerId)) {
      delete book.recruits[key];
    }
  }
};

export interface ActivitySettings {
  /** How far back to look, in days. */
  windowDays: number;
  /** Signs of activity within the window it takes to count as active. */
  minSigns: number;
}

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = { windowDays: 14, minSigns: 1 };

export type ActivityVerdict = 'active' | 'dormant' | 'unclear';

/** What a sign was. Activity moments keep their own kind; score changes say whose reading. */
export type SignKind = ActivityKind | 'score' | 'elvenStatsScore';

/** One sign of activity, worded for the list on an open row. */
export interface Sign {
  at: number;
  kind: SignKind;
  text: string;
}

const signed = (delta: number) => `${delta > 0 ? '+' : ''}${delta.toLocaleString()}`;

const momentText = (moment: ActivityMoment) => {
  switch (moment.kind) {
    case 'message':
      return moment.detail ? `wrote to you: "${moment.detail}"` : 'wrote to you';
    case 'help':
      return moment.detail ? `helped you (${moment.detail})` : 'helped you';
    case 'wonderKp':
      return moment.detail ? `put ${moment.detail}` : 'put KP into your wonder';
    case 'trade':
      return 'accepted your trade';
    case 'tradeOffer':
      return moment.detail ? `offering ${moment.detail} on the market` : 'had a trade offer on the market';
    case 'notification':
      return moment.detail ? `notification: ${moment.detail}` : 'a notification from them';
    case 'other':
      return 'activity (kind not recorded)';
  }
};

/**
 * Every sign of activity inside the window, newest first: what they did themselves, our own score
 * readings that moved, and score changes in the ElvenStats history. A drop counts as much as a
 * rise: selling and rebuilding lower the score, and only someone playing does either. ElvenStats
 * changes do not ask for a fresh check - a dated change is a fact however long ago they looked;
 * only conclusions about now do. Their last change counts on its own when the kept history shows
 * none, since the history is trimmed and their checks come irregularly.
 */
export const activitySignList = (recruit: Recruit, settings: ActivitySettings, now: number): Sign[] => {
  const since = now - settings.windowDays * 24 * 60 * 60 * 1000;
  // Notifications of other kinds were once recorded too, but they can name a player who did nothing
  // - one removed from your fellowship, say - so the ones already stored no longer count.
  const inWindow = recruit.activity.filter((m) => m.at >= since && m.kind !== 'notification');
  const signs: Sign[] = inWindow
    .filter((m) => m.kind !== 'tradeOffer')
    .map((m) => ({ at: m.at, kind: m.kind, text: momentText(m) }));

  // However many offers they have up, trading is one sign: a busy trader is not more active than
  // someone who also writes, helps and builds.
  const offers = inWindow.filter((m) => m.kind === 'tradeOffer');
  if (offers.length > 0) {
    const latest = offers[offers.length - 1];
    signs.push({
      at: latest.at,
      kind: 'tradeOffer',
      text:
        offers.length === 1
          ? momentText(latest)
          : `${offers.length} trade offers on the market${latest.detail ? `, the latest ${latest.detail}` : ''}`,
    });
  }

  recruit.scores.forEach((reading, i) => {
    const previous = previousOfKind(recruit.scores, i);
    if (reading.at >= since && previous && reading.score !== previous.score) {
      const whose = reading.kind === 'overview' ? 'score lookup, approximate' : 'ranking points';
      signs.push({ at: reading.at, kind: 'score', text: `score ${signed(reading.score - previous.score)} (${whose})` });
    }
  });

  const elvenStats = recruit.elvenStats?.found ? recruit.elvenStats : undefined;
  if (elvenStats) {
    const history = elvenStats.history ?? [];
    let changes = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].at >= since && history[i].score !== history[i - 1].score) {
        changes++;
        signs.push({
          at: history[i].at,
          kind: 'elvenStatsScore',
          text: `score ${signed(history[i].score - history[i - 1].score)} (ElvenStats)`,
        });
      }
    }
    if (changes === 0 && elvenStats.lastScoreChange !== undefined && elvenStats.lastScoreChange >= since) {
      signs.push({ at: elvenStats.lastScoreChange, kind: 'elvenStatsScore', text: 'score changed (ElvenStats)' });
    }
  }

  return signs.sort((a, b) => b.at - a.at);
};

/** How many signs of activity there are inside the window. See {@link activitySignList}. */
export const activitySigns = (recruit: Recruit, settings: ActivitySettings, now: number) =>
  activitySignList(recruit, settings, now).length;

const SIGN_SUMMARY_LABELS: Record<SignKind, string> = {
  message: 'message',
  help: 'helped you',
  wonderKp: 'KP into your wonder',
  trade: 'trade accepted',
  tradeOffer: 'trade offer',
  notification: 'other notification',
  other: 'activity',
  score: 'score change',
  elvenStatsScore: 'score change',
};

/** The signs in one line, by kind: "helped you ×2, score change ×1". */
export const summariseSigns = (signs: Sign[]) => {
  const counts = new Map<string, number>();
  for (const sign of signs) {
    const label = SIGN_SUMMARY_LABELS[sign.kind];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => (count > 1 ? `${label} ×${count}` : label)).join(', ');
};

/**
 * Whether ElvenStats says the player has gone quiet: their own inactive flag, or a score they saw
 * unchanged for at least a whole window up to their last check. Their last change on its own
 * proves nothing - it is often just the date of that check.
 *
 * A check younger than {@link ELVENSTATS_FRESH_MS} speaks for now. An older one still does when
 * the quiet it saw lasted longer than the time since: a year without a change, checked twelve
 * days ago, is not undone by twelve days nobody looked; eight quiet days checked twelve days ago
 * could have been followed by anything.
 */
const elvenStatsSaysDormant = (recruit: Recruit, windowMs: number, now: number) => {
  const reading = recruit.elvenStats;
  if (!reading?.found || reading.updatedAt === undefined) {
    return false;
  }
  const sinceCheck = now - reading.updatedAt;
  const quiet = reading.lastScoreChange !== undefined ? reading.updatedAt - reading.lastScoreChange : undefined;
  const trusted = sinceCheck < ELVENSTATS_FRESH_MS || (quiet !== undefined && quiet > sinceCheck);
  if (!trusted) {
    return false;
  }
  return reading.isActive === false || (quiet !== undefined && quiet >= windowMs);
};

/**
 * Active once there are enough signs inside the window. Dormant when the game says so; when a
 * recent ElvenStats scan has them flagged inactive or saw their score unchanged for a whole
 * window, with no sign to the contrary; or when we have watched the score for the whole window,
 * up to recently, without one sign. Anything else has not been watched long enough to tell.
 */
export const activityVerdict = (recruit: Recruit, settings: ActivitySettings, now: number): ActivityVerdict => {
  if (recruit.isActive === false) {
    return 'dormant';
  }
  const signs = activitySigns(recruit, settings, now);
  if (signs >= settings.minSigns) {
    return 'active';
  }
  const windowMs = settings.windowDays * 24 * 60 * 60 * 1000;
  if (signs === 0 && elvenStatsSaysDormant(recruit, windowMs, now)) {
    return 'dormant';
  }
  const watchedSince = recruit.scores[0]?.at;
  const checkedAt = recruit.scoreCheckedAt;
  const watchedLongEnough =
    watchedSince !== undefined && checkedAt !== undefined && checkedAt - watchedSince >= windowMs;
  if (watchedLongEnough && now - checkedAt < windowMs) {
    return signs === 0 ? 'dormant' : 'unclear';
  }
  return 'unclear';
};

/**
 * The open candidate whose score is the stalest, for the refresher to read next, passing over
 * any `skip` says was asked about already: an answer that never comes would otherwise have the
 * refresher asking after the same player for ever.
 */
export const nextScoreRefresh = (
  book: RecruitBook,
  olderThan: number,
  skip: (playerId: number) => boolean = () => false,
) =>
  Object.values(book.recruits)
    .filter(
      (r) =>
        OPEN_STAGES.includes(r.stage) &&
        r.removedAt === undefined &&
        (r.scoreCheckedAt ?? 0) < olderThan &&
        !skip(r.playerId),
    )
    .sort((a, b) => (a.scoreCheckedAt ?? 0) - (b.scoreCheckedAt ?? 0))[0];

/**
 * Keeps a diagnostic, and with `stopRefresh` turns the score refresher off. The first reason it
 * was turned off is the one kept, since whatever follows is likely downstream of it.
 */
export const recordDiagnostic = (book: RecruitBook, diagnostic: RecruitDiagnostic, stopRefresh: boolean) => {
  const diagnostics = (book.diagnostics ??= []);
  diagnostics.push(diagnostic);
  if (diagnostics.length > MAX_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS);
  }
  if (stopRefresh && !book.scoreRefreshOff) {
    book.scoreRefreshOff = { at: diagnostic.at, reason: `${diagnostic.where}: ${diagnostic.message}` };
  }
};

/** Keeps a diagnostic from the ElvenStats lookups and turns them off, keeping the first reason. */
export const recordElvenStatsProblem = (book: RecruitBook, diagnostic: RecruitDiagnostic) => {
  recordDiagnostic(book, diagnostic, false);
  book.elvenStatsOff ??= { at: diagnostic.at, reason: `${diagnostic.where}: ${diagnostic.message}` };
};

/** Forgets the diagnostics and lets the refresher and the ElvenStats lookups run again. */
export const clearDiagnostics = (book: RecruitBook) => {
  delete book.diagnostics;
  delete book.scoreRefreshOff;
  delete book.elvenStatsOff;
};

/**
 * Files an ElvenStats answer with the candidate. Their chapter and fellowship go in as a sighting
 * dated to their scan, so anything the game has shown us since still wins.
 */
export const recordElvenStats = (
  book: RecruitBook,
  playerId: number,
  reading: ElvenStatsReading,
  seen: { name?: string; chapter?: number; guild?: { id: number; name?: string } | null },
  me: Me,
) => {
  const recruit = book.recruits[String(playerId)];
  if (!recruit) {
    return;
  }
  recruit.elvenStats = reading;
  if (reading.found && reading.updatedAt !== undefined && reading.score !== undefined) {
    noteExactScore(recruit, { at: reading.updatedAt, score: reading.score, source: 'elvenstats' });
  }
  if (reading.found && reading.updatedAt !== undefined) {
    recordSighting(
      book,
      {
        playerId,
        name: seen.name || recruit.name,
        source: 'elvenstats',
        at: reading.updatedAt,
        chapter: seen.chapter,
        guild: seen.guild,
      },
      me,
    );
  }
  // Their history may be the first to show they were once one of yours.
  closeFormerMember(book, recruit, Date.now());
};

/** The open candidate asked about least recently on ElvenStats, if any is older than `olderThan`. */
export const nextElvenStatsLookup = (
  book: RecruitBook,
  olderThan: number,
  skip: (playerId: number) => boolean = () => false,
) =>
  Object.values(book.recruits)
    .filter(
      (r) =>
        OPEN_STAGES.includes(r.stage) &&
        r.removedAt === undefined &&
        (r.elvenStats?.checkedAt ?? 0) < olderThan &&
        !skip(r.playerId),
    )
    .sort((a, b) => (a.elvenStats?.checkedAt ?? 0) - (b.elvenStats?.checkedAt ?? 0))[0];

/** The longest detail kept, so one huge answer cannot crowd the book. */
const MAX_DETAIL_LENGTH = 4000;

/** Whatever went wrong, as text worth reading later: an error's stack, anything else as JSON. */
export const describeForDiagnostics = (value: unknown): string => {
  let text: string;
  if (value instanceof Error) {
    text = value.stack || `${value.name}: ${value.message}`;
  } else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}… (${text.length} characters)` : text;
};

/** Counts one answered score lookup, whoever asked - the refresher, or the game opening a profile. */
export const countScoreLookupAnswered = (book: RecruitBook, at: number) => {
  const lookups = (book.scoreLookups ??= { answered: 0, since: at });
  lookups.answered++;
  lookups.lastAnsweredAt = at;
};

/**
 * The score lookup found them in no ranking at all. A candidate nobody has done anything with yet
 * is closed as `gone`; a stage set by hand, or a conversation under way, is left as it is.
 */
export const markUnranked = (recruit: Recruit, at: number) => {
  recruit.unrankedAt = at;
  recruit.scoreCheckedAt = Math.max(recruit.scoreCheckedAt ?? 0, at);
  if (recruit.stage === 'new') {
    setStage(recruit, 'gone', at);
  }
};

/** Hides a candidate from the lists, keeping everything about them. */
export const removeRecruit = (recruit: Recruit, at: number) => {
  recruit.removedAt = at;
  if (recruit.guild) {
    recruit.removedInFellowshipAt = recruit.guildCheckedAt ?? at;
  } else {
    delete recruit.removedInFellowshipAt;
  }
};

/** Brings a removed candidate back, at the stage they had. */
export const restoreRecruit = (recruit: Recruit) => {
  delete recruit.removedAt;
  delete recruit.removedInFellowshipAt;
};
