import { WorldMapStatus } from '../worldmap/deriveWorldMap';
import { OverlayNotice } from './overlayNotices';

/**
 * The world map's notice: up only while there are incomplete provinces the game has not placed,
 * which the player can fix from the game's own Province Overview.
 */
export const worldMapNotice = (status: WorldMapStatus | undefined): OverlayNotice | undefined => {
  const unlocated = status?.unlocated ?? 0;
  if (unlocated <= 0) {
    return undefined;
  }
  return {
    title:
      unlocated === 1
        ? 'World map: 1 incomplete province not located'
        : `World map: ${unlocated} incomplete provinces not located`,
    detail: 'Open the Incomplete tab of Province Overview in the game. Click here for the World Map page.',
    page: 'world-map',
  };
};
