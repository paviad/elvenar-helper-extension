import { getFromStorage } from '../chrome/storage';

export async function getAwBuildings(): Promise<{ id: string; name: string }[]> {
  const json = await getFromStorage('awbuildings');
  if (json) {
    return JSON.parse(json);
  } else {
    return [];
  }
}
