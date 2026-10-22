import { computeCultureBonus, CultureBonus, getCultureBonusLevel } from './cultureBonus';

describe('computeCultureBonus', () => {
  // Culture and population demand, and the thresholds the game sent for that city.
  it.each([
    ['a chapter 5 city', 8379, 8203, [0, 3300, 6600, 9900, 13000]],
    ['another chapter 5 city', 12041, 16678, [0, 5700, 11000, 17000, 23000]],
    ['a chapter 25 city', 3929556, 2904432, [0, 1400000, 2700000, 4100000, 5500000]],
    ['the same city ten days earlier', 3881232, 2869547, [0, 1400000, 2700000, 4100000, 5400000]],
  ])('matches the ladder the game sent for %s', (_, culture, population, thresholds) => {
    expect(computeCultureBonus(culture, population)).toEqual({
      thresholds,
      percentages: [100, 125, 150, 160, 170],
      neighbourlyHelpBonus: 0,
    });
  });

  it('puts every level at 0 for a city with no demand', () => {
    expect(computeCultureBonus(0, 0).thresholds).toEqual([0, 0, 0, 0, 0]);
  });
});

// Taken from a live startup response (chapter 25, with a +864% spell running).
const bonus: CultureBonus = {
  thresholds: [0, 1400000, 2700000, 4100000, 5400000],
  percentages: [100, 989, 1014, 1024, 1034],
  neighbourlyHelpBonus: 3840116,
};

describe('getCultureBonusLevel', () => {
  it('matches what the game reported for the same city', () => {
    // currentCulture 4864640 - currentCultureDemand 3881232
    expect(getCultureBonusLevel(bonus, 983408)).toEqual({
      level: 3,
      percentage: 1024,
      neededForNext: 576476,
      nextPercentage: 1034,
    });
  });

  it('counts a threshold met exactly as reached', () => {
    expect(getCultureBonusLevel(bonus, 5400000 - 3840116).level).toBe(4);
  });

  it('has nothing further to reach at the top level', () => {
    const top = getCultureBonusLevel(bonus, 9000000);
    expect(top).toEqual({ level: 4, percentage: 1034, neededForNext: undefined, nextPercentage: undefined });
  });

  it('stays at level 0 when culture runs short', () => {
    const short = getCultureBonusLevel({ ...bonus, neighbourlyHelpBonus: 0 }, -5000);
    expect(short.level).toBe(0);
    expect(short.percentage).toBe(100);
    expect(short.neededForNext).toBe(1405000);
  });
});
