export interface MessageFromInjectedScript {
  type: 'MY_EXTENSION_MESSAGE';
  payload: {
    value: string;
  };
}

export interface MessageToInjectedScript {
  type: 'MY_OUTGOING_MESSAGE';
  payload: {
    type: 'MARK_AS_READ';
    playerId: number;
    guildId: number;
  };
}
