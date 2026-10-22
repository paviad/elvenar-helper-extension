import React from 'react';
import { computeCultureBonus, CultureModifiers, NO_CULTURE_MODIFIERS } from '../model/cultureBonus';
import { calculateCityBonuses } from './calculateCityBonuses';
import { calculateCultureHelp } from './calculateCultureHelp';
import { useCity } from './CityContext';
import { useSettledValue } from './useSettledValue';

/**
 * The city's population, culture and prosperity with the ancient wonder bonuses added, and its
 * culture bonus ladder. `modifiers` plans the city with other help and enchantments than its
 * own, as the culture modifications dialog does while its sliders move; the ladder is then
 * always worked out rather than taken from the game.
 */
export function useCultureLadder(modifiers?: CultureModifiers) {
  const city = useCity();
  // The totals in context already only move on drop; match that here so the bonus
  // lookups do not rescan the city mid-drag either.
  const settledBlocks = useSettledValue(city.blocks, city.dragIndex === null);
  const blocks = React.useMemo(() => Object.values(settledBlocks), [settledBlocks]);
  const blocksIdAndLevel = React.useMemo(() => blocks.map((b) => ({ id: b.gameId, level: b.level })), [blocks]);
  const { residentialBonus, availablePopulationBonus, cultureByRankingPoints, extraAvailableCulture } = React.useMemo(
    () => calculateCityBonuses(city.effects, city.squadSize, blocksIdAndLevel),
    [city.effects, city.squadSize, blocksIdAndLevel],
  );

  const summary = React.useMemo(() => {
    const {
      popProvided,
      popRequired,
      cultureProvided,
      cultureRequired,
      prosperityProvided,
      prosperityRequired,
      residentialPop,
      awLevels,
      mhRankingPoints,
    } = city.cityTotals;

    const extraResidential = Math.round(residentialPop * (residentialBonus - 1));
    const extraAvailablePopulation = Math.ceil(popRequired * availablePopulationBonus);
    const extraCultureFromRanking = Math.round(cultureByRankingPoints * mhRankingPoints * awLevels);

    const totalPopulationProvided = popProvided + extraResidential + extraAvailablePopulation;
    const totalCultureProvided = cultureProvided + extraAvailableCulture + extraCultureFromRanking;

    return {
      population: {
        provided: totalPopulationProvided,
        required: popRequired,
        net: totalPopulationProvided - popRequired,
      },
      culture: {
        provided: totalCultureProvided,
        required: cultureRequired,
        net: totalCultureProvided - cultureRequired,
      },
      prosperity: {
        provided: prosperityProvided,
        required: prosperityRequired,
        net: prosperityProvided - prosperityRequired,
      },
    };
  }, [city.cityTotals, residentialBonus, availablePopulationBonus, cultureByRankingPoints, extraAvailableCulture]);

  // A played city as the game reported it keeps the game's ladder whole. Any other city, and a
  // played one once the plan moves away from it, gets the ladder the game would set for the
  // plan, with the help and enchantments it is planned with.
  const asReported = !modifiers && !city.isDetached && !city.modified && !!city.cultureBonus;
  const cultureModifiers = modifiers ?? city.cultureModifiers ?? NO_CULTURE_MODIFIERS;
  const cultureHelp = React.useMemo(
    () => calculateCultureHelp(blocks, city.buildingFinder, city.evolvingBuildings, city.effects, cultureModifiers),
    [blocks, city.buildingFinder, city.evolvingBuildings, city.effects, cultureModifiers],
  );
  const cultureBonus = React.useMemo(
    () =>
      asReported && city.cultureBonus
        ? city.cultureBonus
        : computeCultureBonus(
            summary.culture.required,
            summary.population.required,
            cultureHelp.spellFactor,
            cultureHelp.neighbourlyHelpBonus,
          ),
    [asReported, city.cultureBonus, summary.culture.required, summary.population.required, cultureHelp],
  );

  return { summary, cultureHelp, cultureBonus, asReported };
}
