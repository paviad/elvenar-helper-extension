import { listAccounts } from '../elvenar/accountStore';
import { extractElvenarResponse } from '../elvenar/extractElvenarResponse';
import { AncientWonderPhases } from '../elvenar/processNeighborAncientWondersData';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { OtherPlayerClass } from '../model/otherPlayer';
import { PagedRankingList, RankingsData } from '../model/rankingData';
import { Trade } from '../model/trade';
import { WorldNeighbor } from '../model/worldNeighbors';
import {
  ActivityMoment,
  countScoreLookupAnswered,
  describeForDiagnostics,
  markUnranked,
  Me,
  recordActivity,
  recordDiagnostic,
  recordMyGuild,
  recordSighting,
  RecruitBook,
  Sighting,
  syncFromMessages,
} from './recruitBook';
import { withRecruitBook } from './recruitStore';

/**
 * The game leaves empty fields off the wire, so a player in no fellowship arrives with no
 * `guild_info` at all. Every source below that carries the field reads its absence as "none".
 */
const guildOf = (info: { id?: number; name?: string } | undefined | null) =>
  info?.id ? { id: info.id, name: info.name || undefined } : null;

/**
 * The account a response belongs to, and who you are in it. A visit stores the visited city as a
 * detached account under the same session, so the lookup skips detached ones: the recruits must
 * never be filed under, or judged against, the city you happen to be looking at.
 */
const accountFor = (sharedInfo: ExtensionSharedInfo) => {
  const account = listAccounts()
    .map(([, data]) => data)
    .find((data) => !data.isDetached && data.cityQuery?.sessionId === sharedInfo.sessionId);
  const accountId = account?.cityQuery?.accountId;
  if (!account || !accountId) {
    return undefined;
  }
  const userData = account.cityQuery?.userData;
  const me: Me = { playerId: userData?.player_id, guildId: userData?.guild_info?.id || undefined };
  return { account, accountId, me };
};

type RecruitProcessor = (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
) => Promise<void>;

/**
 * Wraps a recruit processor so that whatever it throws is kept as a diagnostic, where it can be
 * read off the Recruits tab, rather than only in the worker's console. With `stopRefresh` a throw
 * also turns the score refresher off. Nothing is rethrown: the recruits are a side line, and the
 * processors registered for the same response must not miss out because of them.
 */
export const guardRecruits =
  (where: string, processor: RecruitProcessor, stopRefresh = false): RecruitProcessor =>
  async (json, sharedInfo, request) => {
    try {
      await processor(json, sharedInfo, request);
    } catch (error) {
      console.warn(`recruits: ${where} failed`, error);
      try {
        await noteDiagnostic(
          sharedInfo,
          where,
          error instanceof Error ? error.message : String(error),
          error,
          stopRefresh,
        );
      } catch (noteError) {
        console.warn('recruits: could not keep the diagnostic', noteError);
      }
    }
  };

const noteDiagnostic = async (
  sharedInfo: ExtensionSharedInfo,
  where: string,
  message: string,
  detail: unknown,
  stopRefresh: boolean,
) => {
  const found = accountFor(sharedInfo);
  if (!found) {
    return;
  }
  await withRecruitBook(found.accountId, (book) =>
    recordDiagnostic(book, { at: Date.now(), where, message, detail: describeForDiagnostics(detail) }, stopRefresh),
  );
};

const recordAll = async (sharedInfo: ExtensionSharedInfo, sightings: Sighting[]) => {
  const found = accountFor(sharedInfo);
  if (!found || sightings.length === 0) {
    return;
  }
  await withRecruitBook(found.accountId, (book) => {
    for (const sighting of sightings) {
      recordSighting(book, sighting, found.me);
    }
  });
};

export const recruitsFromStartup = async (json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const found = accountFor(sharedInfo);
  const [startup] = extractElvenarResponse<{
    guild?: { id?: number; members?: { player?: { player_id?: number } }[] };
  }>(json, 'StartupService', 'getData');
  if (!found) {
    return;
  }
  const guild = startup?.guild;
  await withRecruitBook(found.accountId, (book: RecruitBook) => {
    if (sharedInfo.worldId) {
      book.server = sharedInfo.worldId;
    }
    if (guild?.id) {
      const memberIds = (guild.members ?? []).map((m) => m.player?.player_id).filter((id): id is number => !!id);
      recordMyGuild(book, { id: guild.id, memberIds }, Date.now());
    } else {
      delete book.myGuild;
    }
  });
};

export const recruitsFromWorldNeighbors = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<WorldNeighbor[]>(json, 'WorldMapService', 'getDiscoveredPlayerProvinces')
    .flat()
    .filter((n) => n?.player_id)
    .map((n): Sighting => ({
      playerId: n.player_id,
      name: n.name,
      source: 'neighbour',
      at,
      chapter: n.technology_section,
      guild: guildOf(n.guild_info),
    }));
  await recordAll(sharedInfo, sightings);
};

export const recruitsFromInitialWorldMap = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<InitialWorldMapData>(json, 'WorldMapService', 'fetchInitialWorldMapData')
    .flatMap((data) => data?.player_world_map_area_vo?.provinces ?? [])
    .filter((p) => p.player_id && p.name && p.technology_section !== undefined)
    .map((p): Sighting => ({
      playerId: p.player_id!,
      name: p.name!,
      source: 'neighbour',
      at,
      chapter: p.technology_section,
      guild: guildOf(p.guild_info),
    }));
  await recordAll(sharedInfo, sightings);
};

export const recruitsFromVisit = async (json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<{
    other_player?: OtherPlayerClass & {
      score?: number;
      is_active?: boolean;
      guild_info?: { id: number; name?: string };
    };
    technologySection?: number;
  }>(json, 'OtherPlayerService', 'visitPlayer')
    .filter((visit) => visit?.other_player?.player_id)
    .map((visit): Sighting => {
      const player = visit.other_player!;
      return {
        playerId: player.player_id,
        name: player.name,
        source: 'visit',
        at,
        chapter: visit.technologySection,
        guild: guildOf(player.guild_info),
        score: player.score,
        isActive: player.is_active,
      };
    });
  await recordAll(sharedInfo, sightings);
};

export const recruitsFromNeighbourHelp = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<NeighbourHelpData>(json, 'OtherPlayerService', 'getNeighbourlyHelpBuildings')
    .filter((data) => data?.player?.player_id)
    .map(({ player }): Sighting => ({
      playerId: player.player_id,
      name: player.name,
      source: 'neighbour',
      at,
      guild: guildOf(player.guild_info),
    }));
  await recordAll(sharedInfo, sightings);
};

/** Player ranking pages, which the KP hunt walks through: score and fellowship for eight at a time. */
export const recruitsFromRanking = async (json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<(RankingsData | PagedRankingList)['responseData']>(
    json,
    'RankingService',
    'getRankingList',
  )
    .filter((page) => page?.category === 'player')
    .flatMap((page) => page.rankings ?? [])
    .filter((row) => row?.player?.player_id)
    .map((row): Sighting => ({
      playerId: row.player.player_id,
      name: row.player.name,
      source: 'ranking',
      at,
      guild: guildOf(row.guildInfo),
      score: row.points,
    }));
  await recordAll(sharedInfo, sightings);
};

/**
 * Who has been putting knowledge into the wonders the KP hunt opens. Only levels still being
 * filled are read, so the contributors are ones who gave recently enough for it to matter.
 */
export const recruitsFromWonders = async (json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const at = Date.now();
  const sightings = extractElvenarResponse<{ ancientWonderPhases?: AncientWonderPhases[] }>(
    json,
    'AncientWonderService',
    'getOtherPlayerAncientWonders',
  )
    .flatMap((resp) => resp?.ancientWonderPhases ?? [])
    .filter((phase) => (phase.investedKnowledgePoints ?? 0) < (phase.requiredKnowledgePoints ?? 0))
    .flatMap((phase) => phase.contributions ?? [])
    .filter((c) => c?.player?.player_id)
    .map((c): Sighting => ({
      playerId: c.player.player_id,
      name: c.player.name,
      source: 'wonder',
      at,
      guild: guildOf(c.player.guild_info),
    }));
  await recordAll(sharedInfo, sightings);
};

/**
 * `RankingService/getRankingOverview`, sent by the score refresher and by the game itself when a
 * player's profile is opened. The answer names no player, so the id is read off the request.
 */
export const recruitsFromRankingOverview = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
) => {
  const found = accountFor(sharedInfo);
  const playerId = Array.isArray(request?.requestData) ? Number(request.requestData[0]) : NaN;
  if (!found || !Number.isFinite(playerId)) {
    return;
  }
  const [overview] = extractElvenarResponse<{ category?: string; score?: number }[]>(
    json,
    'RankingService',
    'getRankingOverview',
  );
  // One entry per part of the ranking points (ancient_wonder, culture_demand, encounters,
  // required_population), and no total, so the parts are added up.
  // An empty list is an answer: the player is in no ranking at all - a deleted, reset or banned
  // account, or one too new to be ranked. Kept on the candidate; nothing about the lookup is wrong.
  if (Array.isArray(overview) && overview.length === 0) {
    await withRecruitBook(found.accountId, (book) => {
      const at = Date.now();
      countScoreLookupAnswered(book, at);
      const recruit = book.recruits[String(playerId)];
      if (recruit) {
        markUnranked(recruit, at);
      }
    });
    return;
  }
  const parts = (Array.isArray(overview) ? overview : []).filter((entry) => typeof entry?.score === 'number');
  const score = parts.reduce((sum, entry) => sum + entry.score!, 0);
  if (parts.length === 0) {
    // Not what we have seen it answer, so the refresher stops until someone has looked.
    console.warn('recruits: no scores in the ranking overview for', playerId, overview);
    await noteDiagnostic(
      sharedInfo,
      'score lookup (answer)',
      `No scores in the answer for player ${playerId}`,
      { request: request?.requestData, response: json.filter((entry) => entry.requestClass === 'RankingService') },
      true,
    );
    return;
  }
  // Only for someone already tracked: the answer says nothing about fellowship or chapter.
  await withRecruitBook(found.accountId, (book) => {
    countScoreLookupAnswered(book, Date.now());
    const recruit = book.recruits[String(playerId)];
    if (recruit) {
      recordSighting(
        book,
        { playerId, name: recruit.name, source: 'profile', at: Date.now(), score, scoreKind: 'overview' },
        found.me,
      );
    }
  });
};

/** Runs after the message processors, so it reads the threads as they have just been stored. */
export const recruitsFromMessages = async (_json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const found = accountFor(sharedInfo);
  if (!found) {
    return;
  }
  await withRecruitBook(found.accountId, (book) => syncFromMessages(book, found.account.messagesData, found.me));
};

/**
 * What a notification says the named player did, from its class (rev-eng/10 sections 2.4 and
 * 7.3), with the details worth showing - or nothing, for the kinds that name a player without them
 * having done anything: a fellowship notification about someone removed, a battle, a reward. Only
 * help, knowledge into your wonder and an accepted trade are their own doing.
 */
const notificationKind = (n: {
  __class__?: string;
  entityName?: string;
  knowledgePoints?: number;
}): Omit<ActivityMoment, 'at'> | undefined => {
  switch (n.__class__) {
    case 'NeighborlyHelpNotificationVO':
      return { kind: 'help', detail: n.entityName || undefined };
    case 'AncientWonderResearchContributedNotificationVO': {
      const detail = [n.knowledgePoints && `${n.knowledgePoints} KP`, n.entityName && `into ${n.entityName}`]
        .filter(Boolean)
        .join(' ');
      return { kind: 'wonderKp', detail: detail || undefined };
    }
    case 'TradeAcceptedNotificationVO':
      return { kind: 'trade' };
    default:
      return undefined;
  }
};

/**
 * The game's notifications: help received, knowledge put into your wonders, trades accepted and
 * the like. Each one names who did it and when, and doing it means they were playing - neighbourly
 * help in particular leaves no trace in the helper's score. Only candidates already tracked are
 * touched, since a notification says nothing about fellowship or chapter.
 */
export const recruitsFromNotifications = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) => {
  const found = accountFor(sharedInfo);
  if (!found) {
    return;
  }
  const notifications = [
    ...extractElvenarResponse<unknown>(json, 'NotificationService', 'getAllNotifications'),
    ...extractElvenarResponse<unknown>(json, 'NotificationService', 'getPreviewNotifications'),
  ]
    .flatMap((data) => (Array.isArray(data) ? data : []))
    .map(
      (n) =>
        n as {
          __class__?: string;
          other_player?: { player_id?: number };
          timestamp?: number;
          entityName?: string;
          knowledgePoints?: number;
        },
    )
    .filter((n) => n?.other_player?.player_id && typeof n.timestamp === 'number');
  if (notifications.length === 0) {
    return;
  }
  await withRecruitBook(found.accountId, (book) => {
    for (const n of notifications) {
      const recruit = book.recruits[String(n.other_player!.player_id)];
      const kind = notificationKind(n);
      if (recruit && kind) {
        // Seconds on the wire; anything already in milliseconds is left as it is.
        const at = n.timestamp! < 1e12 ? n.timestamp! * 1000 : n.timestamp!;
        recordActivity(recruit, { at, ...kind });
        recruit.lastSeen = Math.max(recruit.lastSeen, at);
      }
    }
  });
};

/**
 * The market's trade list, read when you open it: everyone with an open offer has been playing
 * lately. Guildless traders come in as candidates; an offer from a candidate counts as activity,
 * once per offer however often the market is opened, dated to when we first saw it - the offer
 * does not say when it was posted.
 */
export const recruitsFromTrades = async (json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const found = accountFor(sharedInfo);
  if (!found) {
    return;
  }
  const at = Date.now();
  const trades = extractElvenarResponse<Trade[]>(json, 'TradeService', 'getOtherPlayersTrades')
    .flatMap((list) => (Array.isArray(list) ? list : []))
    .filter((trade) => trade?.trader?.player_id);
  if (trades.length === 0) {
    return;
  }
  await withRecruitBook(found.accountId, (book) => {
    for (const trade of trades) {
      const { trader } = trade;
      recordSighting(
        book,
        { playerId: trader.player_id, name: trader.name, source: 'trade', at, guild: guildOf(trader.guild_info) },
        found.me,
      );
      const recruit = book.recruits[String(trader.player_id)];
      if (recruit) {
        recordActivity(recruit, {
          at,
          kind: 'tradeOffer',
          detail: `${trade.offer?.value ?? '?'} ${trade.offer?.good_id ?? '?'} for ${trade.need?.value ?? '?'} ${trade.need?.good_id ?? '?'}`,
          ref: `trade:${trade.id}`,
        });
      }
    }
  });
};
