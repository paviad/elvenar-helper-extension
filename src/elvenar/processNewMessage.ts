import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GameMessage } from '../model/gameMessage';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { upsertStoredMessage } from './storeGameMessage';

/**
 * Handles MessageService/sendGuildMessage and /sendMessage, sent when you start a new thread.
 *
 * Without it a thread you have just started stays unknown until the game next refreshes the
 * mail list, and the swap list cannot see a full thread's replacement until then.
 *
 * The reply is taken for the new thread only when it has a thread's shape — an id and a list
 * of posts — so an answer shaped otherwise is passed over rather than stored as something it
 * is not. A thread you started belongs in the outbox.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function processNewMessage(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return;
  }

  const payloads = [
    ...extractElvenarResponse<unknown>(untypedResponseArray, 'MessageService', 'sendGuildMessage'),
    ...extractElvenarResponse<unknown>(untypedResponseArray, 'MessageService', 'sendMessage'),
  ];

  for (const payload of payloads) {
    const message = payload as GameMessage;
    if (message && typeof message === 'object' && typeof message.id === 'number' && Array.isArray(message.posts)) {
      upsertStoredMessage(accountData, message, 'outbox');
    }
  }
}
