import { saveToStorage } from '../chrome/storage';
import { Effect } from '../model/effect';

export const processEffects = async (responseText: string) => {
  const effectsRaw = JSON.parse(responseText) as Effect[];

  const effects = effectsRaw.filter((r) => r.action === 'manufactories_production_boost');

  await setEffects(effects);
};

async function setEffects(items: Effect[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('effects', plain);
}
