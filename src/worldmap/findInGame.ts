import { getFromStorage, removeFromStorage, saveToStorage } from '../chrome/storage';
import { Hex } from './worldMapGeometry';

/**
 * A province the player asked to be shown on the game's own world map, handed from the World Map
 * page to the helper in the game. Kept in storage under the city's key, which the helper watches.
 */
export interface FindInGame extends Hex {
  /** When it was asked for, so that a request left lying about is not picked up days later. */
  sentAt: number;
}

/** How long a request stays worth showing. */
const FIND_LIFETIME_MS = 30 * 60 * 1000;

export const findInGameKey = (accountId: string) => `worldMapFind_${accountId}`;

export const requestFindInGame = (accountId: string, hex: Hex, now = Date.now()) =>
  saveToStorage(findInGameKey(accountId), JSON.stringify({ r: hex.r, q: hex.q, sentAt: now } satisfies FindInGame));

/** What a stored request says, if it is one and still fresh. */
export const parseFindInGame = (json: string | null | undefined, now: number): FindInGame | undefined => {
  if (!json) {
    return undefined;
  }
  try {
    const { r, q, sentAt } = JSON.parse(json) as Partial<FindInGame>;
    return typeof r === 'number' &&
      typeof q === 'number' &&
      typeof sentAt === 'number' &&
      now - sentAt < FIND_LIFETIME_MS
      ? { r, q, sentAt }
      : undefined;
  } catch {
    return undefined;
  }
};

export const getFindInGame = async (accountId: string, now = Date.now()) =>
  parseFindInGame(await getFromStorage(findInGameKey(accountId)), now);

export const clearFindInGame = (accountId: string) => removeFromStorage(findInGameKey(accountId));
