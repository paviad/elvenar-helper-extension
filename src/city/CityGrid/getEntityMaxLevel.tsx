export function getEntityMaxLevel(cityentity_id: string, type: string, maxLevels: Record<string, number>) {
  const prefix = cityentity_id[0];
  let maxLevel = 1;
  if (type.includes('premium')) {
    maxLevel = maxLevels[`X${prefix}`] || 1;
  } else if (prefix === 'M') {
    maxLevel = maxLevels[`M${cityentity_id[2]}`] || 1;
  } else {
    maxLevel = maxLevels[prefix] || 1;
  }
  return maxLevel;
}
