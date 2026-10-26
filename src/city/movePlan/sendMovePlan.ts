import { getAccountById, listAccounts, loadAccount } from '../../elvenar/accountStore';
import { getBuildings } from '../../elvenar/getBuildings';
import { getBuildingSets } from '../../elvenar/getBuildingSets';
import { CityBlock } from '../CityBlock';
import { catalogueOf, currentCity, sizeAtFrom, targetFromBlocks } from './fromGame';
import { saveMoveTarget } from './moveTargetStore';
import { solveMovePlan, Unresolved } from './solveMovePlan';

export type SendMovePlanResult =
  | { sent: true; steps: number; unresolved: Unresolved[] }
  /** The planner is showing someone else's city, so there is no city of the player's to rearrange. */
  | { sent: false; why: 'not-your-city' }
  | { sent: false; why: 'no-city-data' }
  /** Buildings the catalogue does not know, whose size the plan would be guessing at. */
  | { sent: false; why: 'unknown-buildings'; types: string[] };

/**
 * The played account a planner city belongs to: the account itself, or the one a saved layout
 * was copied from, which keeps the player's id. A visited player's city matches none.
 */
export const playedAccountFor = (plannerAccountId: string): string | undefined => {
  const playerId = getAccountById(plannerAccountId)?.cityQuery?.userData?.player_id;
  if (playerId === undefined) {
    return undefined;
  }
  return listAccounts().find(
    ([, account]) => !account.isDetached && account.cityQuery?.userData?.player_id === playerId,
  )?.[0];
};

/**
 * Hands the layout on the planner to the helper in the game, as the city to work towards. The
 * plan is worked out here too, once, so the player hears straight away how long it is and what
 * it cannot do; the helper works it out again from the city as it stands whenever that changes.
 */
export const sendMovePlan = async (
  plannerAccountId: string,
  blocks: CityBlock[],
  from: string,
): Promise<SendMovePlanResult> => {
  const accountId = playedAccountFor(plannerAccountId);
  if (!accountId) {
    return { sent: false, why: 'not-your-city' };
  }
  await loadAccount(accountId);
  const cityQuery = getAccountById(accountId)?.cityQuery;
  if (!cityQuery?.cityEntities) {
    return { sent: false, why: 'no-city-data' };
  }

  const catalogue = catalogueOf(await getBuildings());
  const sets = await getBuildingSets();
  const current = currentCity(cityQuery.cityEntities, cityQuery.unlockedAreas ?? [], catalogue, sets);
  const target = targetFromBlocks(blocks, catalogue, sets);
  const unknown = [...new Set([...current.unknown, ...target.unknown])];
  if (unknown.length) {
    return { sent: false, why: 'unknown-buildings', types: unknown };
  }

  const plan = solveMovePlan(current.value, target.value, sizeAtFrom(catalogue));
  await saveMoveTarget(accountId, from, target.value);
  // A wait is not a step the player takes, so it is not counted as one.
  return { sent: true, steps: plan.steps.filter((step) => step.type !== 'finish').length, unresolved: plan.unresolved };
};

/** What the player is told once the planner has tried to send the layout. */
export const describeSendResult = (result: SendMovePlanResult): string => {
  if (result.sent) {
    const steps = result.steps === 1 ? '1 step' : `${result.steps} steps`;
    const cannot = result.unresolved.length
      ? ` ${result.unresolved.length === 1 ? 'One thing it cannot do is' : `${result.unresolved.length} things it cannot do are`} listed there.`
      : '';
    return result.steps
      ? `Move plan sent to the helper in the game: ${steps}.${cannot}`
      : `Your city already matches this layout.${cannot}`;
  }
  switch (result.why) {
    case 'not-your-city':
      return 'A move plan can only be made for one of your own cities.';
    case 'no-city-data':
      return 'Open the game first, so the helper knows your city as it stands.';
    case 'unknown-buildings':
      return `The game's catalogue does not know ${result.types.join(', ')}. Reload the game and try again.`;
  }
};
