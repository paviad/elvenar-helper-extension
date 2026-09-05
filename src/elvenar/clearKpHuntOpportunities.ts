import { KpHuntData } from '../model/kpHuntData';
import { getAccountById, loadAccount, saveAccount } from './accountStore';

/**
 * Drops one KP Hunt opportunity from a live account, or all of them when none is named.
 *
 * Runs in the service worker, the one context that saves live accounts. It saves after almost
 * every game response, so a save from the overlay was refused whenever one landed between the
 * overlay's read and its write; here the change goes into the copy those saves write from.
 *
 * Returns the opportunities left, or undefined when the account is unknown or was not saved.
 */
export async function clearKpHuntOpportunities(
  accountId: string,
  opportunityId?: string,
): Promise<Record<string, KpHuntData> | undefined> {
  await loadAccount(accountId);
  const accountData = getAccountById(accountId);
  if (!accountData) {
    return undefined;
  }

  if (opportunityId === undefined) {
    accountData.kpHuntOpportunities = {};
  } else {
    const { [opportunityId]: _, ...rest } = accountData.kpHuntOpportunities ?? {};
    accountData.kpHuntOpportunities = rest;
  }

  if (!(await saveAccount(accountId))) {
    return undefined;
  }
  return accountData.kpHuntOpportunities;
}
