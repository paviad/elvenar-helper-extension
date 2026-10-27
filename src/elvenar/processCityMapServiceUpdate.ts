import { CityEntity } from '../model/cityEntity';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './accountStore';

/**
 * Folds the entities the game just reported into the stored city, stamping each with the moment
 * it arrived.
 *
 * The stamp is what makes the state usable as time: `next_state_transition_in` counts from when
 * the state was reported, and these reports land long after the startup data whose
 * `cityQuery.timestamp` would otherwise be taken for their starting point - a production started
 * just now would read as though it had been running since the city loaded.
 */
export const mergeReportedCityEntities = (stored: CityEntity[], reported: CityEntity[], at: number) => {
  for (const entity of reported) {
    const stamped = { ...entity, stateAt: at };
    const existingIndex = stored.findIndex((candidate) => candidate.id === entity.id);
    if (existingIndex === -1) {
      stored.push(stamped);
    } else {
      stored[existingIndex] = stamped;
    }
  }
  return stored;
};

/** Drops the entities with the given ids from the stored city. */
export const removeCityEntities = (stored: CityEntity[], ids: number[]) => {
  const removed = new Set(ids);
  for (let index = stored.length - 1; index >= 0; index--) {
    if (removed.has(stored[index].id)) {
      stored.splice(index, 1);
    }
  }
  return stored;
};

/** What `replaceBuildings` sends in place of an id when the tile held nothing to replace. */
const NOTHING_REPLACED = -2147483648;

interface ConstructionRequest {
  cityEntityId: string;
  x: number;
  y: number;
  cityMapEntityId: number;
}

type CityMapCallProcessor = (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  call: ElvenarRequestResponseEntry,
) => Promise<void>;

/**
 * The game's own answer to the call, which is how a sale it went through is told from one it
 * refused. Nothing is taken out of the city without it.
 */
const answerTo = (responses: ElvenarRequestResponseEntry[], request: ElvenarRequestResponseEntry) =>
  responses.find(
    (response) => response.requestClass === 'CityMapService' && response.requestMethod === request.requestMethod,
  );

/**
 * A building sold. The game's answer says nothing about it - `reset` carries only the neighbours
 * whose bonuses changed - so the request is the only place the sale shows, and without this the
 * stored city kept the building until the next reload.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const processRemoveBuilding: CityMapCallProcessor = async (responses, sharedInfo, call) => {
  const cityEntities = getAccountBySessionId(sharedInfo.sessionId)?.cityQuery?.cityEntities;
  if (cityEntities && answerTo(responses, call)) {
    const [id] = call.requestData as [number];
    removeCityEntities(cityEntities, [id]);
  }
};

/**
 * A building or a street tile moved on its own. The game's answer is empty, and the `reset` with
 * it carries the buildings whose state the move touched but never a street tile, so a street's
 * new spot shows only in the request (seen 2026-10-27: `moveBuilding [19599, 26, 46]`).
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const processMoveBuilding: CityMapCallProcessor = async (responses, sharedInfo, call) => {
  const cityEntities = getAccountBySessionId(sharedInfo.sessionId)?.cityQuery?.cityEntities;
  if (cityEntities && answerTo(responses, call)) {
    const [id, x, y] = call.requestData as [number, number, number];
    const index = cityEntities.findIndex((entity) => entity.id === id);
    if (index !== -1) {
      cityEntities[index] = { ...cityEntities[index], x, y };
    }
  }
};

/** Street tiles sold, as many as were picked at once. Like a building's sale, seen only in the request. */
// eslint-disable-next-line @typescript-eslint/require-await
export const processRemoveStreets: CityMapCallProcessor = async (responses, sharedInfo, call) => {
  const cityEntities = getAccountBySessionId(sharedInfo.sessionId)?.cityQuery?.cityEntities;
  if (cityEntities && answerTo(responses, call)) {
    const [ids] = call.requestData as [number[]];
    removeCityEntities(cityEntities, ids);
  }
};

/**
 * Streets laid. A tile already holding another kind of street is replaced, and the replacement
 * comes back under a new id, so the old id is named only in the request and has to be taken out
 * here. The answer carries the new tiles and, second, the buildings whose state the change
 * touched. Ids are reused - a tile can come back under the id of a building sold a minute
 * before - so the replaced ones go before the new ones are merged in.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const processReplaceBuildings: CityMapCallProcessor = async (responses, sharedInfo, call) => {
  const cityEntities = getAccountBySessionId(sharedInfo.sessionId)?.cityQuery?.cityEntities;
  const answer = answerTo(responses, call);
  if (!cityEntities || !answer) {
    return;
  }

  const [constructions] = call.requestData as [ConstructionRequest[]];
  const replaced = constructions
    .map((construction) => construction.cityMapEntityId)
    .filter((id) => id !== NOTHING_REPLACED);
  removeCityEntities(cityEntities, replaced);

  const [laid, touched] = answer.responseData as [CityEntity[], CityEntity[]];
  mergeReportedCityEntities(cityEntities, [...(laid ?? []), ...(touched ?? [])], Date.now());
};

/**
 * `CityMapService/reset` carries whichever entities have just changed - it is what the game sends
 * when a production is started, collected or cancelled, not only on a city load.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const processCityMapServiceUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const json = untypedJson as [{ requestClass: string; requestMethod: string; responseData: unknown }];

  const cityMapServiceReset = json.find((r) => r.requestClass === 'CityMapService' && r.requestMethod === 'reset')
    ?.responseData as CityEntity[] | undefined;

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData?.cityQuery?.cityEntities && cityMapServiceReset) {
    mergeReportedCityEntities(accountData.cityQuery.cityEntities, cityMapServiceReset, Date.now());
  }
};
