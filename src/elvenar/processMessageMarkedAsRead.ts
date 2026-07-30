import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GameMessage } from '../model/gameMessage';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { upsertStoredMessage } from './storeGameMessage';

// Handles MessageService/markMessageAsRead. The response carries the full updated message
// (now status "read"), which overwrites the stored copy.
// eslint-disable-next-line @typescript-eslint/require-await
export async function processMessageMarkedAsRead(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const messages = extractElvenarResponse<GameMessage>(untypedResponseArray, 'MessageService', 'markMessageAsRead');

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return;
  }

  for (const message of messages) {
    upsertStoredMessage(accountData, message);
  }
}
