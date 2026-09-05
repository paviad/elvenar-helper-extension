import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';
import { PagedRankingList, RankingsData } from '../../model/rankingData';

/**
 * Auto on the KP hunt, as the overlay last relayed it. Off means a ranking page is left alone:
 * nobody's wonders are looked up. Starts off, like the toggle, which comes back off on a reload.
 */
let kpHuntAuto = false;

export const setKpHuntAuto = (on: boolean) => {
  kpHuntAuto = on;
};

export const localProcessRankingsData = async (
  json: ElvenarRequestResponseEntry[],
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  if (!kpHuntAuto) {
    return;
  }

  const rankingService = json.filter(
    (r) => r.requestClass === 'RankingService' && r.requestMethod === 'getRankingList',
  );

  const rankingsDataResponse = rankingService as (RankingsData | PagedRankingList)[];

  if (rankingsDataResponse.length === 0) {
    console.warn('Rankings data response is empty');
    return;
  }

  console.log('Extracted rankings data response:', rankingsDataResponse);

  let playerIds: number[] = [];

  for (const resp of rankingsDataResponse) {
    const playerIdsInResponse = resp.responseData.rankings
      .filter((ranking) => ranking.__class__ === 'PlayerRankingVO')
      .map((ranking) => ranking.player.player_id);
    if (playerIdsInResponse.length === 9) {
      playerIdsInResponse.pop();
    }
    playerIds = playerIds.concat(playerIdsInResponse);
  }

  // const playerIds = rankingsDataResponse[0].responseData.rankings.map((ranking) => ranking.player.player_id);

  // If playerIds has 9 elements, remove the last one
  if (playerIds.length === 9) {
    playerIds.pop();
  }

  console.log('Extracted player IDs from rankings data:', playerIds);

  const serviceConstructor = window.aviad?.['de.innogames.onyx.city.ancientwonders.services.AncientWonderService'];
  const awService = serviceConstructor && new serviceConstructor();

  if (!awService) {
    console.warn('AncientWonderService is not available on window.aviad');
    return;
  }

  for (const playerId of playerIds) {
    awService.getOtherPlayerAncientWonders(playerId, (z) => {
      // ignore
    });
  }
};
