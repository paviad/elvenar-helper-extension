export interface MessageFromInjectedScript {
  type: 'MY_EXTENSION_MESSAGE';
  payload: {
    value: string;
  };
}
