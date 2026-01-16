import { getFromStorage } from '../chrome/storage';

export async function getMaxLevels() {
  const json = await getFromStorage('maxLevels');
  if (json) {
    return JSON.parse(json) as Record<string, number>;
  } else {
    return {};
  }
}
