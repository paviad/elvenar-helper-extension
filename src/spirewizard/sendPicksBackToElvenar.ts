export const sendPicksBackToElvenar = (picks: string[]) => {
  const message = {
    type: 'spirePicks',
    payload: picks,
  };
  window.postMessage(message, '*');
};
