import { getFromStorage, removeFromStorage, saveToStorage } from '../../chrome/storage';
import { TargetBuilding } from './matchBuildings';
import { TargetCity } from './solveMovePlan';

/**
 * The layout a player wants their city turned into, handed from the planner to the helper in the
 * game. The target is kept rather than a list of steps: the steps depend on the city as it stands,
 * which changes with every move, so the helper works them out afresh from the target each time.
 */
export interface MoveTarget {
  /** When it was sent, so a newer layout replaces an older one. */
  sentAt: number;
  /** The planner city it came from, for the helper to name. */
  from: string;
  target: TargetCity;
}

interface StoredMoveTarget {
  sentAt: number;
  from: string;
  buildings: TargetBuilding[];
  streets: [string, string][];
}

export const moveTargetKey = (accountId: string) => `moveTarget_${accountId}`;

export const saveMoveTarget = async (accountId: string, from: string, target: TargetCity) => {
  const stored: StoredMoveTarget = {
    sentAt: Date.now(),
    from,
    buildings: target.buildings,
    streets: [...target.streets],
  };
  await saveToStorage(moveTargetKey(accountId), JSON.stringify(stored));
};

export const getMoveTarget = async (accountId: string): Promise<MoveTarget | undefined> => {
  const json = await getFromStorage(moveTargetKey(accountId));
  if (!json) {
    return undefined;
  }
  const { sentAt, from, buildings, streets } = JSON.parse(json) as StoredMoveTarget;
  return { sentAt, from, target: { buildings, streets: new Map(streets) } };
};

export const clearMoveTarget = (accountId: string) => removeFromStorage(moveTargetKey(accountId));
