import { GameState, GameStateMessage } from '../inject/gameState';

/**
 * Where the game has got to, as the page last reported it.
 *
 * The overlay cannot read the game itself - `window.aviad_am` belongs to the page's world - so
 * this is the only view it has of what is on screen. Nothing until the page has said so, and
 * every caller treats that as "carry on": the page turns away what it should anyway, and a
 * silence there is a version skew, not a reason to stop the extension doing its job.
 */
let latest: GameState | undefined;

export const getGameState = () => latest;

export const setupGameStateListener = () => {
  window.addEventListener('message', (event: MessageEvent<GameStateMessage>) => {
    if (event.source !== window || event.data?.type !== 'gameState') {
      return;
    }
    latest = event.data.payload;
  });
};
