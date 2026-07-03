import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';
import { OtherPlayerClass } from '../../model/otherPlayer';

type HookType = {
  playerId: number;
  hookFn: (otherPlayer: OtherPlayerClass) => void;
}

let trapHooks: HookType[] = [];

// eslint-disable-next-line @typescript-eslint/require-await
export const localTrapVisitPlayer = async (response: ElvenarRequestResponseEntry[]): Promise<void> => {
  const resp = response.find(
    (entry) => entry.requestClass === 'OtherPlayerService' && entry.requestMethod === 'visitPlayer',
  ) as { responseData: { other_player: OtherPlayerClass } } | undefined;
  const otherPlayer = resp?.responseData.other_player;
  console.log('localTrapVisitPlayer: other_player data found:', otherPlayer);

  if (otherPlayer) {
    trapHooks.forEach((hook) => {
      if (hook.playerId === otherPlayer.player_id) {
        console.log(`localTrapVisitPlayer: Invoking hook for playerId ${hook.playerId}`);
        hook.hookFn(otherPlayer);
      }
    });
  }

  trapHooks = trapHooks.filter((hook) => hook.playerId !== otherPlayer?.player_id);
};

export const registerTrapHook = (playerId: number, hookFn: (otherPlayer: OtherPlayerClass) => void): void => {
  trapHooks.push({ playerId, hookFn });
  console.log(`registerTrapHook: Hook registered for playerId ${playerId}`);
};
