import { getFromStorage } from '../chrome/storage';
import { FlexibleReward } from '../model/flexibleReward';

export async function getFlexibleRewards() {
  const json = await getFromStorage('flexibleRewards');
  if (json) {
    return JSON.parse(json) as FlexibleReward[];
  } else {
    return [];
  }
}
