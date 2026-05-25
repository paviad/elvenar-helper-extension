import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';
import { getStoredPicks, storePicksForLaterUse } from '../spirePicksStore';

export const localProcessSpireDiplomacyGetData = async (request: ElvenarRequestResponseEntry[]) => {
  const turnResp = request.find((r) => r.requestClass === 'SpireDiplomacyService' && r.requestMethod === 'submit')
    ?.responseData as { turn: number; state: string } | undefined;
  const turn = turnResp?.turn;
  const state = turnResp?.state;

  console.log('localProcessSpireDiplomacyGetData called with request', request, 'turn:', turn);

  if (turn === 4 || state === 'won') {
    console.log('Turn 4 or won state detected, clearing stored picks and returning early', turn, state);
    storePicksForLaterUse([]);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  const storedPicks = getStoredPicks();
  console.log(
    'Processing SpireDiplomacyService/getData request',
    request,
    window.aviad_wm,
    window.aviad_se,
    storedPicks,
  );

  if (!window.aviad_wm || !window.aviad_se || storedPicks.length === 0) {
    console.log('Required data not available yet, doing nothing');
    return;
  }

  const resources = window.aviad_se.diplomacyCosts.get_resources();

  for (const pick of storedPicks) {
    if (!pick) {
      continue;
    }

    const resource = resources.find((r) => r.id === pick);

    if (!resource) {
      console.warn(`Resource with id ${pick} not found among diplomacy costs`, resources);
      return;
    }

    window.aviad_wm._onInvest({ resource });

    await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay to ensure the game processes each pick
  }
};
