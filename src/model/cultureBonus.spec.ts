import { CultureBonus, getCultureBonusLevel } from './cultureBonus';

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
