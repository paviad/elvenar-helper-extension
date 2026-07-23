import { GameMessage, MessageFolder, MessagePostVO } from '../model/gameMessage';
import { AccountData } from './Accounts';

const FOLDERS: MessageFolder[] = ['inbox', 'outbox'];

// Store/overwrite a single message thread on the account. Responses that return one full
// GuildMessageVO (markMessageAsRead, replyMessage) carry no folder, so the thread is matched
// by id in whichever folder already holds it, defaulting to inbox.
export function upsertStoredMessage(accountData: AccountData, message: GameMessage) {
  if (!message?.id) {
    return;
  }

  const messagesData = accountData.messagesData ?? {};
  const id = String(message.id);

  const targetFolder =
    FOLDERS.find((f) => messagesData[f]?.messages[id] || messagesData[f]?.overview[id] !== undefined) ?? 'inbox';

  const folderData = messagesData[targetFolder] ?? { overview: {}, messages: {} };
  folderData.messages[id] = message;
  folderData.overview[id] = message.updatedAt;
  messagesData[targetFolder] = folderData;

  accountData.messagesData = messagesData;
}

// Append a single new post to an already-stored thread. replyMessage returns only the new post
// (as MessageConversationPostVO), not the whole thread, so we splice it into what we have. If
// the thread isn't stored yet there's nothing to append to — the next fetchMessages brings it.
export function appendPostToStoredMessage(
  accountData: AccountData,
  conversationId: number,
  post: MessagePostVO | undefined,
) {
  if (!conversationId || !post) {
    return;
  }

  const messagesData = accountData.messagesData ?? {};
  const id = String(conversationId);

  const folder = FOLDERS.find((f) => messagesData[f]?.messages[id]);
  const folderData = folder ? messagesData[folder] : undefined;
  if (!folderData) {
    return;
  }

  const message = folderData.messages[id];
  const posts = message.posts ?? [];

  // The reply post carries no post_id, so fall back to identity by time + author + text.
  const alreadyPresent = posts.some((p) =>
    post.post_id !== undefined && p.post_id !== undefined
      ? p.post_id === post.post_id
      : p.created_at === post.created_at &&
        p.author?.player_id === post.author?.player_id &&
        p.post === post.post,
  );
  if (alreadyPresent) {
    return;
  }

  const updatedAt = Math.max(message.updatedAt ?? 0, post.created_at ?? 0);
  folderData.messages[id] = { ...message, posts: [...posts, post], updatedAt };
  folderData.overview[id] = updatedAt;

  accountData.messagesData = messagesData;
}
