export const sendPicksBackToElvenar = (picks: string[], prob?: string, jokerGhost?: number) => {
  const message = {
    type: 'spirePicks',
    payload: picks,
    prob,
    jokerGhost,
  };
  window.postMessage(message, '*');
};
