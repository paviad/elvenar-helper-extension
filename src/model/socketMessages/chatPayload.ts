export interface ChatPayload {
  '@type': 'type.googleapis.com/com.innogames.core.backend.socketserver.GetHistoryResponse';
  messages: ChatMessage[];
  users: ChatUser[];
  lastSeen: string;
}

export interface ChatMessage {
  user: string;
  text: string;
  uuid: string;
  timestamp: string;
  customData?: CustomData;
}

export interface CustomData {
  customJsonDataString: string;
}

export interface ChatUser {
  id: string;
  metadata: ChatMetadata;
}

export interface ChatMetadata {
  public_portrait_id: string;
  public_race: 'elves' | 'humans';
  public_name: string;
}
