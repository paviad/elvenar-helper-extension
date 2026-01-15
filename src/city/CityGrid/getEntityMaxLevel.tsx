import { getPrefix } from '../../util/getPrefix';

export function getEntityMaxLevel(cityentity_id: string, type: string, maxLevels: Record<string, number>) {
  const prefix = getPrefix(cityentity_id, type);
  const maxLevel = maxLevels[prefix] || 1;
  return maxLevel;
}
