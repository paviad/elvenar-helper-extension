import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GameMessage, MessageConversationPostVO } from '../model/gameMessage';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';
import { appendPostToStoredMessage, upsertStoredMessage } from './storeGameMessage';

// Handles MessageService/replyMessage, sent when the user posts a reply in the game.
//
// The response is a MessageConversationPostVO: only the NEW post plus the conversationId of the
// thread it belongs to — not the whole thread, and the post carries no post_id. So we append it
// to the stored thread rather than overwriting. (The full-thread shape is also accepted
// defensively, in case the server ever returns one.)
// eslint-disable-next-line @typescript-eslint/require-await
export async function processReplyMessage(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const payloads = extractElvenarResponse<unknown>(untypedResponseArray, 'MessageService', 'replyMessage');

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return;
  }

  for (const payload of payloads) {
    if (!payload || typeof payload !== 'object') {
      continue;
    }

    const conversationPost = payload as MessageConversationPostVO;
    if (typeof conversationPost.conversationId === 'number' && conversationPost.messagePost) {
      appendPostToStoredMessage(accountData, conversationPost.conversationId, conversationPost.messagePost);
      continue;
    }

    const message = payload as GameMessage;
    if (message.id && Array.isArray(message.posts)) {
      upsertStoredMessage(accountData, message);
    }
  }
}
