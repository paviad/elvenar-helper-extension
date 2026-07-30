import { generateUniqueId } from '../../util/generateUniqueId';
import { useCity } from '../CityContext';
import { ExpansionSize } from '../gridConstants';

/**
 * Unlocks one expansion cell: adds it to the unlocked areas, records it in the
 * move log and leaves unlock-area mode. Shared by the Edit-menu picking mode and
 * the grid's right-click context menu.
 */
export const unlockExpansion = (city: ReturnType<typeof useCity>, cx: number, cy: number) => {
  const area = { x: cx * ExpansionSize, y: cy * ExpansionSize, width: ExpansionSize, length: ExpansionSize };
  city.setUnlockedAreas((prev) => [...prev, area]);
  city.setMoveLog((prev) => [
    ...prev,
    {
      id: generateUniqueId(),
      name: 'Unlocked area',
      from: { x: area.x, y: area.y },
      to: { x: area.x, y: area.y },
      movedChanged: false,
      type: 'unlock',
      unlockedArea: area,
    },
  ]);
  city.clearRedoStack();
  city.setUnlockAreaMode(false);
  city.setMenu(null);
};
