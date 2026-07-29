export const sendPicksBackToElvenar = (picks: string[], prob?: string) => {
  const message = {
    type: 'spirePicks',
    payload: picks,
    prob,
  };
  window.postMessage(message, '*');
};
