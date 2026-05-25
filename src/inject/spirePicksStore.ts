let storeTimestamp = 0;
let spirePicks: string[] = [];

export const storePicksForLaterUse = (picks: string[]) => {
  spirePicks = picks;
  storeTimestamp = Date.now();
  console.log('Spire picks stored for later use:', spirePicks, storeTimestamp);
};

export const getStoredPicks = () => {
  const currentTime = Date.now();
  if (currentTime - storeTimestamp > 10000) {
    // If more than 10 seconds has passed since storing
    console.log('stale picks cleared', spirePicks, storeTimestamp, currentTime, currentTime - storeTimestamp);
    spirePicks = [];
  }
  return spirePicks;
};
