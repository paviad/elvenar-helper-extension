import { saveToStorage } from '../chrome/storage';
import { FlexibleReward } from '../model/flexibleReward';

export const processFlexibleRewards = async (responseText: string) => {
  const flexibleRewards = JSON.parse(responseText) as FlexibleReward[];

  await setFlexibleRewards(flexibleRewards);
};

async function setFlexibleRewards(items: FlexibleReward[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('flexibleRewards', plain);
}
