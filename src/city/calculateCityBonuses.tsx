import { Effect } from '../model/effect';

// Takes the two fields it reads rather than the whole city context. As a context argument
// the callers' memo dependency lists had to name those fields by hand to stay honest,
// with nothing but discipline keeping the two in step.
export function calculateCityBonuses(effects: Effect[], squadSize: number, blocks: { id: string; level: number }[]) {
  const effectsResidentialPopulationBoost = effects.filter((r) => r.action === 'residential_population_boost');
  const effectsAvailablePopulationBonus = effects.filter((r) => r.action === 'available_population_bonus');
  const effectsAvailableCultureBonus = effects.filter((r) => r.action === 'available_culture_bonus');
  const effectsCultureByRankingPoints = effects.filter((r) => r.action === 'culture_by_ranking_points');
  const residentialBonus = effectsResidentialPopulationBoost
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.id.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 1;
      return factor;
    })
    .reduce((sum, effect) => sum * (effect || 1), 1);

  const availablePopulationBonus = effectsAvailablePopulationBonus
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.id.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const availableCultureBonus = effectsAvailableCultureBonus
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.id.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const cultureByRankingPoints = effectsCultureByRankingPoints
    .map((r) => {
      const block = r.origins?.map((origin) => blocks.find((b) => b.id.startsWith(origin))).filter((r) => !!r)[0];
      if (!block) return 0;
      const level = block.level;
      const factor = r.values?.[level] || 0;
      return factor;
    })
    .reduce((sum, effect) => sum + (effect || 0), 0);

  const extraAvailableCulture = Math.round(squadSize * availableCultureBonus);
  return { residentialBonus, availablePopulationBonus, cultureByRankingPoints, extraAvailableCulture };
}
