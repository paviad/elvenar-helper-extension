import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GameMessage, MessageListVO } from '../model/gameMessage';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';

// Handles MessageService/fetchMessages.
// Details arrive per folder (possibly in batches as the user scrolls). We merge each
// thread by id into the folder's message map, overwriting any prior copy of that thread.
// eslint-disable-next-line @typescript-eslint/require-await
export async function processMessages(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const lists = extractElvenarResponse<MessageListVO>(untypedResponseArray, 'MessageService', 'fetchMessages');

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return;
  }

  const messagesData = accountData.messagesData ?? {};

  for (const list of lists) {
    if (!list?.folder) {
      continue;
    }

    const folderData = messagesData[list.folder] ?? { overview: {}, messages: {} };
    const overview = { ...folderData.overview };
    const messages: Record<string, GameMessage> = { ...folderData.messages };

    for (const message of list.messages ?? []) {
      const id = String(message.id);
      messages[id] = message;
      // Ensure the thread is listed even if the overview hasn't loaded yet.
      if (overview[id] === undefined) {
        overview[id] = message.updatedAt;
      }
    }

    messagesData[list.folder] = { overview, messages };
  }

  accountData.messagesData = messagesData;
}
