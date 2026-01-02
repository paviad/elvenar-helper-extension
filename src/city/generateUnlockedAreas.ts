import { UnlockedArea } from '../model/unlockedArea';

export function generateUnlockedAreas(unlockedAreas: UnlockedArea[]): UnlockedArea[] {
  return unlockedAreas.map((r) => ({ ...r, x: r.x || 0, y: r.y || 0 }));
}
