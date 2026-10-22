/**
 * A city's culture bonus ladder: how much spare culture each level takes, and what it pays.
 *
 * For the city being played, as the game reported it, this comes from the game at startup
 * (`city_culture`). For any other city it is worked out by `computeCultureBonus`.
 */
export interface CultureBonus {
  /** Culture needed for each level, starting with level 0 at 0. */
  thresholds: number[];
  /** Production bonus per level in percent, with any active spell already added in. */
  percentages: number[];
  neighbourlyHelpBonus: number;
}

/**
 * How much neighbourly help and Ensorcelled Endowment a city is planned with: the share of its
 * culture buildings that are helped, and the share of those helped buildings that are enchanted.
 * Both run from 0 to 1. An enchantment only counts on a helped building, as in the game.
 */
export interface CultureModifiers {
  help: number;
  enchant: number;
}

export const NO_CULTURE_MODIFIERS: CultureModifiers = { help: 0, enchant: 0 };

/**
 * Which buildings of a played city were helped and enchanted at startup, by the game's entity
 * id. The shares a plan gets are worked out from these where the buildings' sizes are known.
 */
export interface CultureHelpState {
  helped: string[];
  enchanted: string[];
}

export interface CultureBonusLevel {
  level: number;
  percentage: number;
  /** Culture still missing for the next level, or undefined at the top of the ladder. */
  neededForNext?: number;
  nextPercentage?: number;
}

/** The bonus per level with no spell running. */
const BASE_PERCENTAGES = [100, 125, 150, 160, 170];

/** Rounds to two significant figures, the way the game rounds its thresholds. */
function roundToTwoFigures(value: number): number {
  if (value <= 0) return 0;
  const step = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / step) * step;
}

/**
 * The ladder the game would set for a city with these demands. Level n needs n fifths of the
 * combined culture and population demand, rounded to two significant figures; this reproduces
 * every ladder the game has sent, at chapter 5 and at 25. A spell adds its percentage to every
 * level above the first, and neighbourly help counts towards the thresholds like spare culture.
 */
export function computeCultureBonus(
  cultureDemand: number,
  populationDemand: number,
  spellFactor = 0,
  neighbourlyHelpBonus = 0,
): CultureBonus {
  const demand = cultureDemand + populationDemand;
  return {
    thresholds: BASE_PERCENTAGES.map((_, level) => roundToTwoFigures((demand * level) / 5)),
    percentages: BASE_PERCENTAGES.map((percentage, level) => (level === 0 ? percentage : percentage + spellFactor)),
    neighbourlyHelpBonus,
  };
}

/** The bonus level a city with `availableCulture` to spare reaches. */
export function getCultureBonusLevel(bonus: CultureBonus, availableCulture: number): CultureBonusLevel {
  const culture = availableCulture + bonus.neighbourlyHelpBonus;
  let level = 0;
  while (level + 1 < bonus.thresholds.length && culture >= bonus.thresholds[level + 1]) level++;
  const next = level + 1 < bonus.thresholds.length ? level + 1 : undefined;
  return {
    level,
    percentage: bonus.percentages[level] ?? 100,
    neededForNext: next === undefined ? undefined : bonus.thresholds[next] - culture,
    nextPercentage: next === undefined ? undefined : bonus.percentages[next],
  };
}
