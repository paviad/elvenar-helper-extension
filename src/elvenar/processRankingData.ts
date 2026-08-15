import { debounceTime, groupBy, mergeMap, Subject } from 'rxjs';
import { sendRetrievingCounterUpdateMessage } from '../chrome/messages';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { PagedRankingList, RankingsData } from '../model/rankingData';

const playerIdToPageIndexMapCache: Record<number, number> = {};
const playerIdToGuildNameMapCache: Record<number, string | undefined> = {};

const retrievingCounter: Record<number, number> = {};

interface NotifyData {
  retrievingCounter: number;
  tabId: number;
}

const retrievingCounterSubject = new Subject<NotifyData>();

retrievingCounterSubject
  .pipe(
    groupBy((data) => data.tabId),
    mergeMap((group) => group.pipe(debounceTime(50))),
  )
  .subscribe((data) => {
    console.log(`Retrieving counter updated: ${data.retrievingCounter} for tabId: ${data.tabId}`);
    void sendRetrievingCounterUpdateMessage(data.tabId, data.retrievingCounter);
  });

// eslint-disable-next-line @typescript-eslint/require-await
export const processRankingData = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  const rankingsDataResponse = untypedJson as (RankingsData | PagedRankingList)[];
  const tabId = sharedInfo.tabId;

  for (const resp of rankingsDataResponse) {
    const pageIndex = resp.responseData.pageIndex;

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
