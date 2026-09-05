import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';
import { storePicksForLaterUse, waitForPicks } from '../spirePicksStore';

// The wizard tab is throttled hard when it is occluded, so this has to tolerate a reply
// that takes far longer than the round trip normally does.
const PICKS_TIMEOUT_MS = 30000;

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

  await new Promise((resolve) => setTimeout(resolve, 500)); // let the game settle, as before
  const storedPicks = await waitForPicks(PICKS_TIMEOUT_MS);
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

  // Bound to one window for the whole fill. Frames are filled in order, so a loop that read
  // window.aviad_wm afresh each time and crossed into a newly opened diplomacy window part way
  // through would leave the rest of the picks in that window's frames, every one of them shifted.
  const mediator = window.aviad_wm;
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

    if (window.aviad_wm !== mediator) {
      console.warn('ElvenAssist: the diplomacy window changed while filling it; stopping', storedPicks, pick);
      return;
    }

    mediator._onInvest({ resource });

    await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay to ensure the game processes each pick
  }
};
