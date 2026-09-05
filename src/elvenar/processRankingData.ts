import { debounceTime, groupBy, mergeMap, Subject } from 'rxjs';
import { sendToTab } from '../chrome/messages';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { PagedRankingList, RankingsData } from '../model/rankingData';
import { getAccountBySessionId } from './accountStore';

const playerIdToPageIndexMapCache: Record<number, number> = {};
const playerIdToGuildNameMapCache: Record<number, string | undefined> = {};

const retrievingCounter: Record<number, number> = {};

interface NotifyData {
  retrievingCounter: number;
  tabId: number;
}

const retrievingCounterSubject = new Subject<NotifyData>();

/**
 * Tabs whose count was dropped rather than worked off. The flag is read off here rather than
 * carried on the notification because the notifications are debounced: a response landing right
 * after the hunt stopped would otherwise be the one that gets through, and the overlay would
 * take the zero for a finished scan and sound the alert.
 */
const abandonedTabs = new Set<number>();

retrievingCounterSubject
  .pipe(
    groupBy((data) => data.tabId),
    mergeMap((group) => group.pipe(debounceTime(50))),
  )
  .subscribe((data) => {
    const abandoned = abandonedTabs.delete(data.tabId);
    console.log(`Retrieving counter updated: ${data.retrievingCounter} for tabId: ${data.tabId}`);
    void sendToTab(data.tabId, 'retrievingCounterUpdate', { retrievingCounter: data.retrievingCounter, abandoned });
  });

/**
 * Tabs with Auto on in the KP hunt. Kept in session storage rather than memory, because the worker
 * is stopped when idle and a hunt left on would otherwise stop being counted while the page goes
 * on looking wonders up. Missing reads as off, which is what the toggle comes back as on a reload.
 */
const kpHuntAutoKey = (tabId: number) => `kpHuntAuto-${tabId}`;

const isKpHuntAuto = async (tabId: number): Promise<boolean> =>
  (await chrome.storage.session.get(kpHuntAutoKey(tabId)))[kpHuntAutoKey(tabId)] === true;

export const setKpHuntAuto = async (tabId: number, on: boolean): Promise<void> => {
  if (on) {
    await chrome.storage.session.set({ [kpHuntAutoKey(tabId)]: true });
    return;
  }
  await chrome.storage.session.remove(kpHuntAutoKey(tabId));
  if (retrievingCounter[tabId]) {
    resetRetrievingCounter(tabId);
  }
};

export const processRankingData = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  const rankingsDataResponse = untypedJson as (RankingsData | PagedRankingList)[];
  const tabId = sharedInfo.tabId;

  // With Auto off, paging through the ranking is the player's own business: the page looks no
  // wonders up, so there is nothing to count, and the hunt's last page stays where it was.
  if (!(await isKpHuntAuto(tabId))) {
    return;
  }

  for (const resp of rankingsDataResponse) {
    // The server leaves zero-valued fields out, so the first page arrives with no pageIndex at all.
    const pageIndex = resp.responseData.pageIndex ?? 0;

    if (resp.responseData.category === 'player') {
      const accountData = getAccountBySessionId(sharedInfo.sessionId);
      if (accountData) {
        accountData.kpHuntLastPage = { pageIndex, timestamp: Date.now() };
      }
    }

    const playerIds = resp.responseData.rankings?.map((ranking) => ranking.player.player_id) || [];
    const guildNames = resp.responseData.rankings?.map((ranking) => ranking.guildInfo?.name) || [];

    // If playerIds has 9 elements, remove the last one
    if (playerIds.length === 9) {
      playerIds.pop();
    }

    retrievingCounter[tabId] = retrievingCounter[tabId] || 0;

    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const guildName = guildNames[i];
      playerIdToPageIndexMapCache[playerId] = pageIndex;
      playerIdToGuildNameMapCache[playerId] = guildName;
      retrievingCounter[tabId]++;
    }
  }

  retrievingCounterSubject.next({ retrievingCounter: retrievingCounter[tabId], tabId });
};

export const getPlayerPageIndex = (playerId: number): number | undefined => {
  return playerIdToPageIndexMapCache[playerId];
};

export const getPlayerGuildName = (playerId: number): string | undefined => {
  return playerIdToGuildNameMapCache[playerId];
};

export const getRetrievingCounter = (tabId: number): number => {
  return retrievingCounter[tabId] || 0;
};

export const decrementRetrievingCounter = (sharedInfo: ExtensionSharedInfo): void => {
  const tabId = sharedInfo.tabId;
  retrievingCounter[tabId] = Math.max(0, retrievingCounter[tabId] - 1);
  retrievingCounterSubject.next({ retrievingCounter: retrievingCounter[tabId], tabId });
};

export const setGuildName = (playerId: number, guildName: string): void => {
  playerIdToGuildNameMapCache[playerId] = guildName;
};

export const incrementRetrievingCounter = (amount: number, sharedInfo: ExtensionSharedInfo): void => {
  const tabId = sharedInfo.tabId;
  retrievingCounter[tabId] = (retrievingCounter[tabId] || 0) + amount;
  retrievingCounterSubject.next({ retrievingCounter: retrievingCounter[tabId], tabId });
};

/**
 * Drops whatever the tab was still waiting for. Turning Auto off stops the pages coming, so the
 * outstanding count would otherwise never be worked off and every later scan would start high.
 */
const resetRetrievingCounter = (tabId: number): void => {
  retrievingCounter[tabId] = 0;
  abandonedTabs.add(tabId);
  retrievingCounterSubject.next({ retrievingCounter: 0, tabId });
};
