import { saveToStorage } from '../chrome/storage';
import { Effect } from '../model/effect';

export const processEffects = async (responseText: string) => {
  const effectsRaw = JSON.parse(responseText) as Effect[];

  const captureEffects = [
    'manufactories_production_boost',
    'residential_population_boost',
    'available_population_bonus',
    'available_culture_bonus',
    'culture_by_ranking_points',
  ];

  const effects = effectsRaw.filter((r) => captureEffects.includes(r.action));

  await setEffects(effects);
};

async function setEffects(items: Effect[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('effects', plain);
}
