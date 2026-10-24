import { getFromStorage } from '../chrome/storage';
import { BUILDING_PREVIEWS_KEY, BuildingPreviews } from './buildingPreviews';

/** Undefined until the extension has seen the game load once since the previews were added. */
export const getBuildingPreviews = async (): Promise<BuildingPreviews | undefined> => {
  const json = await getFromStorage(BUILDING_PREVIEWS_KEY);
  return json ? (JSON.parse(json) as BuildingPreviews) : undefined;
};
