import { CauldronBrew } from '../cauldron/cauldronBrew';
import { listAccounts, loadAllAccounts } from '../elvenar/accountStore';

/**
 * Every recorded brew of every city, oldest first, as JSON to copy out.
 *
 * Meant to be called by hand from the service worker's console — chrome://extensions, then
 * "Inspect views: service worker" under ElvenAssist:
 *
 *   copy(await ElvenAssist.cauldronBrews())
 */
export async function cauldronBrewsReport(): Promise<string> {
  await loadAllAccounts();
  // Cities saved from the planner are copies, and carry the brews of the account they came from
  const brews: CauldronBrew[] = listAccounts()
    .map(([, a]) => a)
    .filter((a) => !a.isDetached && !a.savedFrom)
    .flatMap((a) => a.cauldronBrews ?? [])
    .sort((a, b) => a.at - b.at);
  return JSON.stringify(brews, null, 2);
}
