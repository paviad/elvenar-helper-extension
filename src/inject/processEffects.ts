import { Effect } from '../model/effect';

export const processEffects = (responseText: string) => {
  const effectsRaw = JSON.parse(responseText) as Effect[];

  const effects = effectsRaw.filter((r) => r.action === 'manufactories_production_boost');

  return { effects };
};
