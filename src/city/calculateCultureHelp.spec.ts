import { Building } from '../model/building';
import { Effect } from '../model/effect';
import { StageProvision } from '../model/stageProvision';
import { makeBuilding, makeCityBlock, makeCityEntityEx } from '../testing/fixtures';
import { BuildingFinder } from './buildingFinder';
import { calculateCultureHelp, cultureModifiersFromState } from './calculateCultureHelp';
import { CityBlock } from './CityBlock';
import { GridMax } from './gridConstants';

const culture = (id: string, amount: number, type = 'culture') =>
  makeBuilding({
    id,
    base_name: id.replace(/_\d+$/, ''),
    type,
    provisions: { resources: { resources: { culture: amount } } },
  });

const catalog: Record<string, Building> = {
  C_Big_1: culture('C_Big_1', 1000),
  C_Mid_1: culture('C_Mid_1', 500),
  C_Small_1: culture('C_Small_1', 100, 'culture_residential'),
  C_Evolving_1: culture('C_Evolving_1', 200),
  R_Workshop_1: culture('R_Workshop_1', 50, 'production'),
  B_HelpWonder_3: makeBuilding({ id: 'B_HelpWonder_3', base_name: 'B_HelpWonder', type: 'ancient_wonder' }),
  B_SpellWonder_2: makeBuilding({ id: 'B_SpellWonder_2', base_name: 'B_SpellWonder', type: 'ancient_wonder' }),
};

const finder = {
  getBuilding: (id: string) => (catalog[id] ? { sourceBuilding: catalog[id] } : undefined),
} as unknown as BuildingFinder;

let nextId = 1;
const blockOf = (gameId: string, overrides: Partial<CityBlock> = {}): CityBlock =>
  makeCityBlock({
    gameId,
    id: nextId++,
    level: Number(/_(\d+)$/.exec(gameId)?.[1] ?? 1),
    entity: makeCityEntityEx({ cityentity_id: gameId }),
    x: 10,
    y: 10,
    ...overrides,
  });

const city = [blockOf('C_Big_1'), blockOf('C_Mid_1'), blockOf('C_Small_1'), blockOf('R_Workshop_1')];

const effect = (action: string, origin: string, values: Record<string, number>, targets?: string[]) =>
  ({ action, origins: [origin], values, targets }) as unknown as Effect;

describe('calculateCultureHelp', () => {
  it('adds nothing without help', () => {
    expect(calculateCultureHelp(city, finder, [], [], { help: 0, enchant: 1 })).toEqual({
      helpable: 3,
      helped: 0,
      enchanted: 0,
      neighbourlyHelpBonus: 0,
      spellFactor: 0,
    });
  });

  it('helps the biggest culture buildings first, doubling their culture', () => {
    // Two thirds of three buildings: the 1000 and the 500, not the 100.
    expect(calculateCultureHelp(city, finder, [], [], { help: 2 / 3, enchant: 0 })).toMatchObject({
      helped: 2,
      neighbourlyHelpBonus: 1500,
    });
  });

  it('enchants a share of the helped buildings only, 5% each', () => {
    expect(calculateCultureHelp(city, finder, [], [], { help: 2 / 3, enchant: 0.5 })).toMatchObject({
      helped: 2,
      enchanted: 1,
      spellFactor: 5,
    });
  });

  it('counts an evolving building at its stage', () => {
    const evolving: StageProvision[] = [
      { baseName: 'C_Evolving', stages: [{ id: 3, culture: 3 }] } as unknown as StageProvision,
    ];
    const result = calculateCultureHelp([blockOf('C_Evolving_1', { stage: 3 })], finder, evolving, [], {
      help: 1,
      enchant: 0,
    });
    expect(result.neighbourlyHelpBonus).toBe(600);
  });

  it('applies the wonders that raise help and the spell', () => {
    const effects = [
      effect('higher_culture_boost', 'B_HelpWonder', { 3: 1.5 }),
      effect('increase_spell_power_boost', 'B_SpellWonder', { 2: 1.4 }, ['spell_neighborly_help_boost_1']),
      // Raises another spell, so it leaves Ensorcelled Endowment alone.
      effect('increase_spell_power_boost', 'B_SpellWonder', { 2: 9 }, ['spell_supply_production_boost_1']),
    ];
    const withWonders = [...city, blockOf('B_HelpWonder_3'), blockOf('B_SpellWonder_2')];

    expect(calculateCultureHelp(withWonders, finder, [], effects, { help: 1, enchant: 1 })).toMatchObject({
      helped: 3,
      enchanted: 3,
      neighbourlyHelpBonus: 2400,
      spellFactor: 36,
    });
  });

  it('leaves out buildings one tile wide or deep, which help cannot reach', () => {
    const thin = [
      blockOf('C_Big_1', { width: 1, length: 6 }),
      blockOf('C_Mid_1', { width: 4, length: 1 }),
      blockOf('C_Small_1'),
    ];
    expect(calculateCultureHelp(thin, finder, [], [], { help: 1, enchant: 0 })).toMatchObject({
      helpable: 1,
      neighbourlyHelpBonus: 100,
    });
  });

  it('leaves out buildings parked outside the grid', () => {
    const parked = [blockOf('C_Big_1', { x: GridMax + 5 }), blockOf('C_Mid_1')];
    expect(calculateCultureHelp(parked, finder, [], [], { help: 1, enchant: 0 })).toMatchObject({
      helpable: 1,
      neighbourlyHelpBonus: 500,
    });
  });
});

describe('cultureModifiersFromState', () => {
  const blocks = [
    blockOf('C_Big_1', { entity: makeCityEntityEx({ id: 11, cityentity_id: 'C_Big_1' }) }),
    blockOf('C_Mid_1', { entity: makeCityEntityEx({ id: 12, cityentity_id: 'C_Mid_1' }) }),
    blockOf('C_Small_1', { entity: makeCityEntityEx({ id: 13, cityentity_id: 'C_Small_1' }) }),
    blockOf('C_Small_1', { width: 1, entity: makeCityEntityEx({ id: 14, cityentity_id: 'C_Small_1' }) }),
    blockOf('R_Workshop_1', { entity: makeCityEntityEx({ id: 15, cityentity_id: 'R_Workshop_1' }) }),
  ];

  it('gives the helped share of the buildings help can reach, and the enchanted share of those', () => {
    const state = { helped: ['11', '12'], enchanted: ['11'] };
    expect(cultureModifiersFromState(blocks, finder, [], state)).toEqual({ help: 2 / 3, enchant: 0.5 });
  });

  it('does not count an enchantment on a building nobody helped', () => {
    const state = { helped: ['11'], enchanted: ['12'] };
    expect(cultureModifiersFromState(blocks, finder, [], state)).toEqual({ help: 1 / 3, enchant: 0 });
  });

  it('leaves out the thin building and the workshop, whatever the game says of them', () => {
    const state = { helped: ['14', '15'], enchanted: ['14'] };
    expect(cultureModifiersFromState(blocks, finder, [], state)).toEqual({ help: 0, enchant: 0 });
  });
});
