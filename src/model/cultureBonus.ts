/**
 * The culture bonus ladder as the game reported it at startup (`city_culture`).
 *
 * The thresholds are set by the server and grow with the city, so they cannot be derived from
 * the buildings. The neighbourly help bonus counts towards the thresholds alongside available
 * culture, and it too only comes from the server.
 */
export interface CultureBonus {
  /** Culture needed for each level, starting with level 0 at 0. */
  thresholds: number[];
  /** Production bonus per level in percent, with any active spell already added in. */
  percentages: number[];
  neighbourlyHelpBonus: number;
}

export interface CultureBonusLevel {
  level: number;
  percentage: number;
  /** Culture still missing for the next level, or undefined at the top of the ladder. */
  neededForNext?: number;
  nextPercentage?: number;
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
