import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function getPremiumBuildingHints(): Promise<{ id: string; section: string }[]> {
  const json = await getFromStorage('premiumBuildingHints');
  if (json) {
    return JSON.parse(json);
  } else {
    return [];
  }
}
