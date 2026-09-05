/**
 * Visits a player's city and nothing more, the way clicking their province would. The KP hunt's
 * `localVisitPlayer` goes on to open a wonder; this is for looking a candidate recruit over, and
 * the visit's answer gives their chapter, fellowship and score along the way.
 */
export const localVisitCity = (playerId: number) => {
  const am = window.aviad_am;
  const vopcCtor = window.aviad['de.innogames.onyx.city.commands.VisitOtherPlayerCommand'];
  const vopc = am.injector.getOrCreateNewInstance(vopcCtor);
  const eventCtor = window.aviad['de.innogames.strategycity.main.controller.event.OtherPlayerEvent'];
  vopc.event = new eventCtor('OtherPlayerEvent::visitPlayer', playerId);
  vopc.execute();
};
