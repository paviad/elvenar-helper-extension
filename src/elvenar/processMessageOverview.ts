import { GameMessage, MessageMetadataVO } from '../model/gameMessage';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';

// Handles MessageService/getMessageOverview.
// The overview lists every message id in a folder with its last-updated timestamp.
// We overwrite the folder's overview (no history) and prune any previously-fetched
// message threads that no longer appear in the overview (i.e. deleted in-game).
// eslint-disable-next-line @typescript-eslint/require-await
export async function processMessageOverview(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const metadatas = extractElvenarResponse<MessageMetadataVO>(
    untypedResponseArray,
    'MessageService',
    'getMessageOverview',
  );

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return;
  }

  const messagesData = accountData.messagesData ?? {};

  for (const meta of metadatas) {
    if (!meta?.folder) {
      continue;
    }

    const overview: Record<string, number> = {};
    for (const [id, ts] of Object.entries(meta.metadata ?? {})) {
      if (id === '__class__') {
        continue; // the game's Dictionary marker, not a message id
      }
      overview[id] = Number(ts);
    }

    // Keep already-fetched threads that still exist; drop the rest.
    const existingMessages = messagesData[meta.folder]?.messages ?? {};
    const messages: Record<string, GameMessage> = {};
    for (const [id, message] of Object.entries(existingMessages)) {
      if (id in overview) {
        messages[id] = message;
      }
    }

    messagesData[meta.folder] = { overview, messages };
  }

  accountData.messagesData = messagesData;
}
