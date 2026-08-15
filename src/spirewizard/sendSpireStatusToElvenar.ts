export type SpireStatus = 'waiting' | 'timeout';

/**
 * Rides the spirePicks channel but carries no picks. The game-side overlay shows it on the
 * badge and deliberately does NOT relay it to the page, so it cannot disturb the picks store.
 */
export const sendSpireStatusToElvenar = (status: SpireStatus, turn: number) => {
  const message = {
    type: 'spirePicks',
    payload: [],
    status,
    turn,
  };
  window.postMessage(message, '*');
};
