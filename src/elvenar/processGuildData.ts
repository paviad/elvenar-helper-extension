import { GuildDataResponse } from '../inject/local/localProcessGuildData';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { incrementRetrievingCounter, setGuildName } from './processRankingData';

// eslint-disable-next-line @typescript-eslint/require-await
export const processGuildData = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  const guildDataResponse = untypedJson as GuildDataResponse[];

  for (const resp of guildDataResponse) {
    const playerIds = resp.responseData.members?.map((ranking) => ranking.player.player_id) || [];
    const guildName = resp.responseData.name;

    for (const playerId of playerIds) {
      setGuildName(playerId, guildName);
    }

    incrementRetrievingCounter(playerIds.length, sharedInfo);
  }
};
