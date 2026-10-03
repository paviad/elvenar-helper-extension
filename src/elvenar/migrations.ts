import { getFromStorage, saveManyToStorage, saveToStorage } from '../chrome/storage';
import { AccountData, accountKey, accountStampKey } from './Accounts';

export const loadAccountManagerFromStorageV1 = async () => {
  const accountsRaw = await getFromStorage('accounts');
  let accountsV1: Record<string, AccountData> = {};
  if (accountsRaw) {
    const parsedAccounts = JSON.parse(accountsRaw) as Record<string, AccountData>;
    accountsV1 = { ...parsedAccounts };
  }
  return accountsV1;
};

/** Splits the one record of all accounts that version 1 kept into a record per account. */
export const migrateV1ToV2 = async () => {
  const accountsV1 = await loadAccountManagerFromStorageV1();
  const accountIds = Object.keys(accountsV1);
  for (const accountId of accountIds) {
    console.log(`ElvenAssist: Migrating account ${accountId}`);
    await saveManyToStorage({
      [accountKey(accountId)]: JSON.stringify(accountsV1[accountId]),
      [accountStampKey(accountId)]: Date.now().toString(),
    });
  }
  const numAccounts = +((await getFromStorage('num_accounts')) || 0);
  if (numAccounts <= 1 && accountIds.length > 1) {
    await saveToStorage('notifyMultipleAccounts', 'true');
  }
  await saveToStorage('num_accounts', accountIds.length.toString());
};

export const migrate = async (latestVersion: number) => {
  const dbVersionRaw = await getFromStorage('db_version');
  const dbVersion = dbVersionRaw ? +dbVersionRaw : 1;

  if (dbVersion === latestVersion) {
    return;
  }

  if (dbVersion < 2) {
    console.log('ElvenAssist: Migrating from version 1 to version 2');
    await migrateV1ToV2();
  }

  console.log('ElvenAssist: Migration completed, setting db_version to', latestVersion);
  await saveToStorage('db_version', latestVersion.toString());
};
export const dbVersion = 2;
