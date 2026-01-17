export interface ReceivedWebsocketMessage {
  type: 'RECEIVED_WEBSOCKET_MESSAGE';
  payload: {
    value: string;
  };
}

export interface SendWebsocketMessage {
  type: 'SEND_WEBSOCKET_MESSAGE';
  payload: {
    type: 'MARK_AS_READ';
    playerId: number;
    guildId: number;
  };
}
