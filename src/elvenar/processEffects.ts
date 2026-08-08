import { saveToStorage } from '../chrome/storage';
import { Effect } from '../model/effect';

export const processEffects = async (responseText: string) => {
  const effectsRaw = JSON.parse(responseText) as Effect[];

  const expirations = effectsRaw
    .filter((r) => r.origins && r.duration)
    .map((r) => ({ origins: r.origins, duration: r.duration }))
    .flatMap((z) => z.origins!.map((o) => ({ origin: o, duration: z.duration })))
    .reduce(
      (acc, v) => ({ ...acc, [v.origin]: Math.max(acc[v.origin] || 0, v.duration!) }),
      {} as Record<string, number>,
    );

  await setExpirations(expirations);

  const captureEffects = [
    'manufactories_production_boost',
    'residential_population_boost',
    'available_population_bonus',
    'available_culture_bonus',
    'culture_by_ranking_points',
    'spell_pet_food_1',
    'unlimited_help',
  ];

  const effects = effectsRaw.filter((r) => captureEffects.includes(r.action));

  await setEffects(effects);
};

async function setEffects(items: Effect[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('effects', plain);
}

async function setExpirations(items: Record<string, number>) {
  const plain = JSON.stringify(items);
  await saveToStorage('expirations', plain);
}
