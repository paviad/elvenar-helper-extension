import { localOpenAw } from './localOpenAw';
import { registerTrapHook } from './localTrapVisitPlayer';

export const localVisitPlayer = (payload: { playerId: number; buildingId: string; baseName: string }) => {
  const am = window.aviad_am;
  const vopcCtor = window.aviad['de.innogames.onyx.city.commands.VisitOtherPlayerCommand'];
  const vopc = am.injector.getOrCreateNewInstance(vopcCtor);
  const eventCtor = window.aviad['de.innogames.strategycity.main.controller.event.OtherPlayerEvent'];
  const event = new eventCtor('OtherPlayerEvent::visitPlayer', payload.playerId);
  vopc.event = event;

  registerTrapHook(payload.playerId, () => {
    async function Do() {
      while (window.aviad_am.get_isLoading()) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 500);
        });
      }
      // console.log('would call localOpenAw here');
      localOpenAw(payload.playerId, payload.buildingId, payload.baseName);
    }
    console.log(`Trap hook triggered for playerId: ${payload.playerId}`);
    Do().catch((error) => {
      console.warn(`Error in trap hook for playerId ${payload.playerId}:`, error);
    });
  });

  vopc.execute();
};
