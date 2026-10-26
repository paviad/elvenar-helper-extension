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
  /** An older saved layout of a player with cities on several worlds, which does not say whose it is. */
  | { sent: false; why: 'which-world' }
  | { sent: false; why: 'no-city-data' }
  /** Buildings the catalogue does not know, whose size the plan would be guessing at. */
  | { sent: false; why: 'unknown-buildings'; types: string[] };

/**
 * The played account a planner city belongs to: the account itself when it is being played, or
 * the one a saved layout was saved from. A player has the same id on every world, so the id alone
 * names their city only when they play one; a layout saved before it kept its source, from a
 * player on several worlds, cannot be told apart and is said to be so. A visited player's city
 * belongs to none.
 */
export const playedAccountFor = (
  plannerAccountId: string,
): { accountId: string } | { why: 'not-your-city' | 'which-world' } => {
  const shown = getAccountById(plannerAccountId);
  if (shown && !shown.isDetached) {
    return { accountId: plannerAccountId };
  }
  const played = (id: string | undefined) => id !== undefined && getAccountById(id)?.isDetached === false;
  if (played(shown?.savedFrom)) {
    return { accountId: shown!.savedFrom! };
  }
  const playerId = shown?.cityQuery?.userData?.player_id;
  const candidates = listAccounts().filter(
    ([, account]) =>
      playerId !== undefined && !account.isDetached && account.cityQuery?.userData?.player_id === playerId,
  );
  if (candidates.length === 1) {
    return { accountId: candidates[0][0] };
  }
  return { why: candidates.length ? 'which-world' : 'not-your-city' };
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
  const owner = playedAccountFor(plannerAccountId);
  if ('why' in owner) {
    return { sent: false, why: owner.why };
  }
  const { accountId } = owner;
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
    case 'which-world':
      return 'This layout was saved before saved layouts kept which world they belong to, and you play on more than one. Open your own city in the planner and send it from there.';
    case 'no-city-data':
      return 'Open the game first, so the helper knows your city as it stands.';
    case 'unknown-buildings':
      return `The game's catalogue does not know ${result.types.join(', ')}. Reload the game and try again.`;
  }
};
