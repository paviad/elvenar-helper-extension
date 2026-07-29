import { Effect, EffectClass, Modifier, Type } from '../model/effect';
import { calculateCityBonuses } from './calculateCityBonuses';
import { CityContextType } from './CityContext';

function effect(action: string, origins: string[], values: Record<string, number>): Effect {
  return {
    __class__: EffectClass.EffectConfigVO,
    effectId: 1,
    action,
    modifier: Modifier.Factor,
    triggerChance: 1,
    type: Type.Global,
    origins,
    values,
  };
}

/** calculateCityBonuses only reads effects and squadSize off the context. */
const context = (effects: Effect[], squadSize = 0) => ({ effects, squadSize }) as CityContextType;

describe('residentialBonus', () => {
  it('is neutral when there are no effects', () => {
    expect(calculateCityBonuses(context([]), []).residentialBonus).toBe(1);
  });

  it('reads the factor at the level of the originating building', () => {
    const effects = [effect('residential_population_boost', ['Z_Wonder'], { 1: 1.1, 5: 1.5 })];
    const blocks = [{ id: 'Z_Wonder_5', level: 5 }];

    expect(calculateCityBonuses(context(effects), blocks).residentialBonus).toBe(1.5);
  });

  it('multiplies factors across effects', () => {
    const effects = [
      effect('residential_population_boost', ['Z_WonderA'], { 1: 2 }),
      effect('residential_population_boost', ['Z_WonderB'], { 1: 3 }),
    ];
    const blocks = [
      { id: 'Z_WonderA_1', level: 1 },
      { id: 'Z_WonderB_1', level: 1 },
    ];

    expect(calculateCityBonuses(context(effects), blocks).residentialBonus).toBe(6);
  });

  it('stays neutral for an effect whose building is not in the city', () => {
    const effects = [effect('residential_population_boost', ['Z_Missing'], { 1: 2 })];

    expect(calculateCityBonuses(context(effects), []).residentialBonus).toBe(1);
  });

  it('matches origins as a prefix of the building id', () => {
    const effects = [effect('residential_population_boost', ['Z_Wonder'], { 3: 2 })];
    const blocks = [{ id: 'Z_Wonder_Deluxe_3', level: 3 }];

    expect(calculateCityBonuses(context(effects), blocks).residentialBonus).toBe(2);
  });

  it('is neutral when the level has no configured value', () => {
    const effects = [effect('residential_population_boost', ['Z_Wonder'], { 1: 2 })];
    const blocks = [{ id: 'Z_Wonder_9', level: 9 }];

    expect(calculateCityBonuses(context(effects), blocks).residentialBonus).toBe(1);
  });
});

describe('availablePopulationBonus', () => {
  it('sums across effects', () => {
    const effects = [
      effect('available_population_bonus', ['Z_WonderA'], { 1: 0.1 }),
      effect('available_population_bonus', ['Z_WonderB'], { 1: 0.25 }),
    ];
    const blocks = [
      { id: 'Z_WonderA_1', level: 1 },
      { id: 'Z_WonderB_1', level: 1 },
    ];

    expect(calculateCityBonuses(context(effects), blocks).availablePopulationBonus).toBeCloseTo(0.35);
  });

  it('is zero with no effects', () => {
    expect(calculateCityBonuses(context([]), []).availablePopulationBonus).toBe(0);
  });
});

describe('extraAvailableCulture', () => {
  it('scales the culture bonus by squad size and rounds', () => {
    const effects = [effect('available_culture_bonus', ['Z_Wonder'], { 1: 0.5 })];
    const blocks = [{ id: 'Z_Wonder_1', level: 1 }];

    expect(calculateCityBonuses(context(effects, 1001), blocks).extraAvailableCulture).toBe(501);
  });

  it('is zero when there is no squad size', () => {
    const effects = [effect('available_culture_bonus', ['Z_Wonder'], { 1: 0.5 })];
    const blocks = [{ id: 'Z_Wonder_1', level: 1 }];

    expect(calculateCityBonuses(context(effects, 0), blocks).extraAvailableCulture).toBe(0);
  });
});

describe('cultureByRankingPoints', () => {
  it('sums the per-level factors', () => {
    const effects = [effect('culture_by_ranking_points', ['Z_Wonder'], { 2: 0.02 })];
    const blocks = [{ id: 'Z_Wonder_2', level: 2 }];

    expect(calculateCityBonuses(context(effects), blocks).cultureByRankingPoints).toBeCloseTo(0.02);
  });

  it('ignores effects with other actions', () => {
    const effects = [effect('some_other_action', ['Z_Wonder'], { 1: 5 })];
    const blocks = [{ id: 'Z_Wonder_1', level: 1 }];

    expect(calculateCityBonuses(context(effects), blocks)).toEqual({
      residentialBonus: 1,
      availablePopulationBonus: 0,
      cultureByRankingPoints: 0,
      extraAvailableCulture: 0,
    });
  });
});
