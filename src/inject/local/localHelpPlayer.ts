export const localHelpPlayer = (playerId: number) => {
  const svcCtor = window.aviad['de.innogames.onyx.city.service.NeighborlyHelpService'];
  const svc = new svcCtor();
  svc.helpPlayer(playerId, (response: unknown) => {
    console.log(`localHelpPlayer: Helped player ${playerId}, response:`, response);
  });
};
