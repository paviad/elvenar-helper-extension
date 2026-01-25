import { getFromStorage } from '../chrome/storage';

export async function getMaxLevels() {
  const maxLevelsAll = await getMaxLevelsAll();
  const maxLevelsFeature = await getMaxLevelsFeature();
  return { ...maxLevelsAll, ...maxLevelsFeature };
}

async function getMaxLevelsAll() {
  const json = await getFromStorage('maxLevelsAll');
  if (json) {
    return JSON.parse(json) as Record<string, number>;
  } else {
    return {};
  }
}

async function getMaxLevelsFeature() {
  const json = await getFromStorage('maxLevelsFeature');
  if (json) {
    return JSON.parse(json) as Record<string, number>;
  } else {
    return {};
  }
}
