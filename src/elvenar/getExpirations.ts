import { getFromStorage } from '../chrome/storage';

export async function getExpirations() {
  const json = await getFromStorage('expirations');
  if (json) {
    return JSON.parse(json) as Record<string, number>;
  } else {
    return {};
  }
}
