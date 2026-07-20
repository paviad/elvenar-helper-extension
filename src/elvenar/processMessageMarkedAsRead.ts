import { GameMessage, MessageFolder } from '../model/gameMessage';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';

const FOLDERS: MessageFolder[] = ['inbox', 'outbox'];

// Handles MessageService/markMessageAsRead. The response carries the full updated message
// (now status "read") but no folder, so we overwrite it wherever it's already stored,
// defaulting to inbox (mark-as-read is an inbox action).
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

  const messagesData = accountData.messagesData ?? {};

  for (const message of messages) {
    if (!message?.id) {
      continue;
    }
    const id = String(message.id);

    const targetFolder =
      FOLDERS.find((f) => messagesData[f]?.messages[id] || messagesData[f]?.overview[id] !== undefined) ?? 'inbox';

    const folderData = messagesData[targetFolder] ?? { overview: {}, messages: {} };
    folderData.messages[id] = message;
    folderData.overview[id] = message.updatedAt;
    messagesData[targetFolder] = folderData;
  }

  accountData.messagesData = messagesData;
}
