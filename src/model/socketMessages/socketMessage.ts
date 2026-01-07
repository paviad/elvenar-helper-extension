import { ChatPayload } from './chatPayload';
import { SendPayload } from './sendPayload';
import { WhoPayload } from './whoPayload';

export interface SocketMessageBase {
  type: string;
  headers: Record<string, string>;
}

export interface SocketMessageChatHistory extends SocketMessageBase {
  type: 'ChatHistory';
  body: { event: string; payload: ChatPayload };
}

export interface SocketMessageWho extends SocketMessageBase {
  type: 'Who';
  body: { event: string; payload: WhoPayload };
}

export interface SocketMessageSend extends SocketMessageBase {
  type: 'SendMessage';
  body: SendPayload;
}

export type SocketMessage = SocketMessageChatHistory | SocketMessageWho | SocketMessageSend;
