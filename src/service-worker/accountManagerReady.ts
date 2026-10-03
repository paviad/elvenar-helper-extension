import { loadAllAccounts } from '../elvenar/accountStore';

/**
 * The accounts read back from storage, started as early as possible and awaited by any handler
 * that looks an account up. The service worker is torn down whenever it goes idle, so a message
 * can wake it and be delivered while `accounts` is still the empty object a fresh worker starts
 * with - a lookup made then finds nothing at all.
 */
export const accountManagerReady = loadAllAccounts();
