// Models for the in-game Messages panel (MessageService).
// Two responses feed this feature:
//  - getMessageOverview -> MessageMetadataVO (per folder: id -> updatedAt timestamp)
//  - fetchMessages      -> MessageListVO     (per folder: full message threads)

export type MessageFolder = 'inbox' | 'outbox';

export interface BasePlayerVO {
  __class__?: string;
  player_id: number;
  name: string;
  avatar?: string;
  race?: string;
}

export interface MessagePostVO {
  __class__?: string;
  post_id?: number; // absent on the post returned by replyMessage
  author: BasePlayerVO;
  post: string;
  created_at: number; // unix seconds
}

export interface GuildInfoVO {
  __class__?: string;
  id: number;
  name: string;
  banner?: unknown;
}

export interface GameMessage {
  __class__?: string;
  id: number;
  subject: string;
  initiator: BasePlayerVO;
  recipients?: string[];
  status: string; // 'new' when unread
  posts: MessagePostVO[];
  created_at: string; // human-readable, as sent by the game
  updatedAt: number; // unix seconds
  guildId?: number;
  guild?: GuildInfoVO;
}

// getMessageOverview response
export interface MessageMetadataVO {
  __class__?: string;
  folder: MessageFolder;
  // id -> updatedAt (seconds); the dictionary also carries a "__class__" key we ignore
  metadata: Record<string, number | string>;
}

// replyMessage response — NOT a full thread: just the new post plus the thread it belongs to.
export interface MessageConversationPostVO {
  __class__?: string;
  conversationId: number;
  messagePost: MessagePostVO;
}

// fetchMessages response
export interface MessageListVO {
  __class__?: string;
  folder: MessageFolder;
  messages: GameMessage[];
  length: number;
}

// ---- Stored shape (per account, overwritten on each update, no history) ----

export interface MessageFolderData {
  overview: Record<string, number>; // messageId -> updatedAt (seconds)
  messages: Record<string, GameMessage>; // messageId -> full thread (as fetched)
}

export type MessagesData = Partial<Record<MessageFolder, MessageFolderData>>;
