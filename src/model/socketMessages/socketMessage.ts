import { ChatPayload } from './chatPayload';
import { SendPayload } from './sendPayload';
import { WhoPayload } from './whoPayload';

export interface SocketMessageBase {
  type: string;
  headers: Record<string, string>;
}

export interface SocketMessageChatHistory extends SocketMessageBase {
  type: 'chat/rpc/get-history';
  body: { event: string; payload: ChatPayload };
}

export interface SocketMessageWho extends SocketMessageBase {
  type: 'chat/who';
  body: { event: string; payload: WhoPayload };
}

export interface SocketMessageSend extends SocketMessageBase {
  type: 'chat/send';
  body: SendPayload;
}

export type SocketMessage = SocketMessageChatHistory | SocketMessageWho | SocketMessageSend;
