import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Quest } from '../model/quest';
import { getAccountIdBySessionId, getAccountById, setAccountData } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processQuestUpdates(json: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) {
  const quests = json.find((r) => r.requestClass === 'QuestService' && r.requestMethod === 'getUpdates')?.responseData as
    | Quest[]
    | undefined;

  if (!quests) {
    return;
  }

  console.log('Processing quest updates:', quests);
}
