export const relayToGame = (type: string, payload?: unknown) => {
  window.postMessage(
    {
      type,
      payload,
    },
    '*',
  );
};
