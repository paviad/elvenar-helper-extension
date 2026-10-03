import React from 'react';
import { AccountData } from './Accounts';
import {
  accountListVersion,
  accountVersion,
  getAccountById,
  listAccounts,
  loadAccount,
  subscribeToAccounts,
} from './accountStore';

/** How many mounted views show each account here. */
const onScreen: Record<string, number> = {};

/**
 * Whether a view here shows the account, and so whether a save of it elsewhere is worth reading.
 * An account runs to megabytes and the overlay reads it on the game's own thread, so it is not
 * read for nobody.
 */
export const isAccountOnScreen = (accountId: string) => (onScreen[accountId] ?? 0) > 0;

/**
 * The account as held here now, redrawn whenever it changes: read again after a save elsewhere,
 * replaced, deleted, or saved here. Read it afresh on each render rather than keeping it in state;
 * the object is replaced whenever the account is read again.
 */
export function useAccount(accountId: string | null | undefined): AccountData | undefined {
  // The count is what React watches: a change made in place and saved leaves the object the same.
  React.useSyncExternalStore(subscribeToAccounts, () => (accountId ? accountVersion(accountId) : 0));

  React.useEffect(() => {
    if (!accountId) {
      return;
    }
    onScreen[accountId] = (onScreen[accountId] ?? 0) + 1;
    // Whatever was saved while nothing here showed the account was not read; a view opens on
    // what is stored now. Nothing is read when the stamp shows the copy here is current.
    void loadAccount(accountId);
    return () => {
      onScreen[accountId]--;
    };
  }, [accountId]);

  return accountId ? getAccountById(accountId) : undefined;
}

/** The accounts held here, as listAccounts gives them, redrawn whenever any of them changes. */
export function useAccountList(includeAutosave = false): [string, AccountData][] {
  const version = React.useSyncExternalStore(subscribeToAccounts, accountListVersion);
  // The count stands for the accounts, which the lint rule cannot see listAccounts read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => listAccounts(includeAutosave), [version, includeAutosave]);
}
