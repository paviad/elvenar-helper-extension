import { getFromStorage, saveToStorage } from '../chrome/storage';
import { AccountData, accounts, saveSingleAccount } from './Accounts';

export const loadAccountManagerFromStorageV1 = async () => {
  const accountsRaw = await getFromStorage('accounts');
  let accountsV1: Record<string, AccountData> = {};
  if (accountsRaw) {
    const parsedAccounts = JSON.parse(accountsRaw) as Record<string, AccountData>;
    accountsV1 = { ...parsedAccounts };
  }
  return accountsV1;
};

export const migrateV1ToV2 = async () => {
  const accountsV1 = await loadAccountManagerFromStorageV1();
  for (const [accountId, accountData] of Object.entries(accountsV1)) {
    console.log(`ElvenAssist: Migrating account ${accountId}`);
    accounts[accountId] = accountData;
    await saveSingleAccount(accountId);
  }
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
}; export const dbVersion = 2;

