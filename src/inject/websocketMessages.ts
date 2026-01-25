export interface ReceivedWebsocketMessage {
  type: 'RECEIVED_WEBSOCKET_MESSAGE';
  payload: {
    value: string;
  };
}
