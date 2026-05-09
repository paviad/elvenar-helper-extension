import { debounceTime, Subject } from 'rxjs';
import { sendRetrievingCounterUpdateMessage } from '../chrome/messages';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { PagedRankingList, RankingsData } from '../model/rankingData';

const playerIdToPageIndexMapCache: Record<number, number> = {};
const playerIdToGuildNameMapCache: Record<number, string | undefined> = {};

let retrievingCounter = 0;

interface NotifyData {
  retrievingCounter: number;
  tabId: number;
}

const retrievingCounterSubject = new Subject<NotifyData>();

const retrievingCounterNotify = retrievingCounterSubject.pipe(debounceTime(50)).subscribe((data) => {
  void sendRetrievingCounterUpdateMessage(data.tabId, data.retrievingCounter);
});

// eslint-disable-next-line @typescript-eslint/require-await
export const processRankingData = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  const rankingsDataResponse = untypedJson as (RankingsData | PagedRankingList)[];

  for (const resp of rankingsDataResponse) {
    const pageIndex = resp.responseData.pageIndex;

    const playerIds = resp.responseData.rankings?.map((ranking) => ranking.player.player_id) || [];
    const guildNames = resp.responseData.rankings?.map((ranking) => ranking.guildInfo?.name) || [];

    // If playerIds has 9 elements, remove the last one
    if (playerIds.length === 9) {
      playerIds.pop();
    }

    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const guildName = guildNames[i];
      playerIdToPageIndexMapCache[playerId] = pageIndex;
      playerIdToGuildNameMapCache[playerId] = guildName;
      retrievingCounter++;
    }
  }

  retrievingCounterSubject.next({ retrievingCounter, tabId: sharedInfo.tabId });
};

export const getPlayerPageIndex = (playerId: number): number | undefined => {
  return playerIdToPageIndexMapCache[playerId];
};

export const getPlayerGuildName = (playerId: number): string | undefined => {
  return playerIdToGuildNameMapCache[playerId];
};

export const getRetrievingCounter = (): number => {
  return retrievingCounter;
};

export const decrementRetrievingCounter = (sharedInfo: ExtensionSharedInfo): void => {
  retrievingCounter = Math.max(0, retrievingCounter - 1);
  retrievingCounterSubject.next({ retrievingCounter, tabId: sharedInfo.tabId });
};

export const setGuildName = (playerId: number, guildName: string): void => {
  playerIdToGuildNameMapCache[playerId] = guildName;
};

export const incrementRetrievingCounter = (amount: number, sharedInfo: ExtensionSharedInfo): void => {
  retrievingCounter += amount;
  retrievingCounterSubject.next({ retrievingCounter, tabId: sharedInfo.tabId });
};
