import { Building } from '../../../model/building';
import { BuildingEx } from '../../../model/buildingEx';
import { InventoryItem } from '../../../model/inventoryItem';
import { StageProvision } from '../../../model/stageProvision';
import { makeBuilding, makeCityBlock, makeCityEntityEx } from '../../../testing/fixtures';
import { CityBlock } from '../../CityBlock';
import { findClearUpgrades } from './findClearUpgrades';

const HOUR = 3_600;

function buildingEx(sourceOverrides: Partial<Building> = {}, exOverrides: Partial<BuildingEx> = {}): BuildingEx {
  const sourceBuilding = makeBuilding({ type: 'culture', ...sourceOverrides });
  return {
    id: sourceBuilding.id,
    name: sourceBuilding.name,
    type: sourceBuilding.type,
    length: sourceBuilding.length,
    width: sourceBuilding.width,
    connectionStrategy: sourceBuilding.requirements.connectionStrategyId,
    resale_resources: sourceBuilding.resale_resources,
    spellFragments: sourceBuilding.spellFragments,
    sourceBuilding,
    ...exOverrides,
  };
}

/** A 2x2 city building producing `mana` mana per hour with `culture` culture. */
function cityBuilding(id: string, manaPerHour: number, culture = 0, size: [number, number] = [2, 2]): BuildingEx {
  return buildingEx({
    id,
    name: `City ${id}`,
    width: size[0],
    length: size[1],
    production: {
      isSwitchable: false,
      products: [{ production_time: HOUR, revenue: { resources: { mana: manaPerHour } } }],
    },
    provisions: culture ? { resources: { resources: { culture } } } : undefined,
  });
}

function invItem(building: BuildingEx | undefined, overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 100,
    amount: 1,
    type: 'Building',
    subtype: building?.id ?? 'item_x',
    changedAt: 0,
    properties: [],
    building,
    ...overrides,
  };
}

function blockFor(building: BuildingEx, overrides: Partial<Omit<CityBlock, 'entity'>> = {}): CityBlock {
  return makeCityBlock({
    entity: makeCityEntityEx({
      cityentity_id: building.id,
      type: building.type,
      width: building.width,
      length: building.length,
      name: building.name,
      level: building.sourceBuilding.level,
    }),
    ...overrides,
  });
}

function finderFor(...buildings: BuildingEx[]) {
  return { getBuilding: (id: string) => buildings.find((b) => b.id === id) };
}

describe('findClearUpgrades', () => {
  it('suggests a same-size building with strictly better production', () => {
    const old = cityBuilding('A_Old_1', 10, 20);
    const candidate = buildingEx({
      id: 'A_New_1',
      name: 'Better',
      width: 2,
      length: 2,
      production: { isSwitchable: false, products: [{ production_time: HOUR, revenue: { resources: { mana: 20 } } }] },
      provisions: { resources: { resources: { culture: 20 } } },
    });

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].oldValues).toEqual({ mana: 240, culture: 20 });
    expect(result.suggestions[0].newValues).toEqual({ mana: 480, culture: 20 });
    expect(result.resourceKeys).toEqual(['culture', 'mana']);
  });

  it('rejects a candidate missing a resource the old building produces', () => {
    const old = buildingEx({
      id: 'A_Old_1',
      production: {
        isSwitchable: false,
        products: [{ production_time: HOUR, revenue: { resources: { mana: 10, seeds: 10 } } }],
      },
    });
    const candidate = buildingEx({
      id: 'A_New_1',
      production: { isSwitchable: false, products: [{ production_time: HOUR, revenue: { resources: { mana: 99 } } }] },
    });

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('rejects a candidate providing less culture', () => {
    const old = cityBuilding('A_Old_1', 10, 50);
    const candidate = cityBuilding('A_New_1', 20, 40);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('rejects a bigger candidate whose per-square efficiency is worse', () => {
    const old = cityBuilding('A_Old_1', 10); // 240/day on 4 squares = 60/sq
    const candidate = cityBuilding('A_New_1', 11, 0, [4, 4]); // 264/day on 16 squares = 16.5/sq

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('accepts a smaller candidate with equal output', () => {
    const old = cityBuilding('A_Old_1', 10);
    const candidate = cityBuilding('A_New_1', 10, 0, [1, 2]);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(1);
  });

  it('requires every option of a switchable building to be covered', () => {
    const old = buildingEx({
      id: 'A_Old_1',
      production: {
        isSwitchable: true,
        products: [
          { production_time: HOUR, revenue: { resources: { mana: 10 } } },
          { production_time: HOUR, revenue: { resources: { seeds: 10 } } },
        ],
      },
    });
    const simultaneous = buildingEx({
      id: 'A_New_1',
      production: {
        isSwitchable: false,
        products: [{ production_time: HOUR, revenue: { resources: { mana: 10, seeds: 10, orcs: 5 } } }],
      },
    });
    const manaOnly = buildingEx({
      id: 'A_New_2',
      production: { isSwitchable: true, products: [{ production_time: HOUR, revenue: { resources: { mana: 99 } } }] },
    });

    const result = findClearUpgrades(
      [blockFor(old)],
      finderFor(old),
      [],
      [invItem(simultaneous, { id: 1 }), invItem(manaOnly, { id: 2 })],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].itemId).toBe(1);
  });

  it('never considers inventory items that require population or culture', () => {
    const old = cityBuilding('A_Old_1', 10);
    const needsPop = buildingEx({
      id: 'A_New_1',
      production: { isSwitchable: false, products: [{ production_time: HOUR, revenue: { resources: { mana: 99 } } }] },
      requirements: { resources: { population: 50 }, connectionStrategyId: 'street' },
    });
    const needsCulture = buildingEx({
      id: 'A_New_2',
      production: { isSwitchable: false, products: [{ production_time: HOUR, revenue: { resources: { mana: 99 } } }] },
      requirements: { resources: { culture: 50 }, connectionStrategyId: 'street' },
    });

    const result = findClearUpgrades(
      [blockFor(old)],
      finderFor(old),
      [],
      [invItem(needsPop, { id: 1 }), invItem(needsCulture, { id: 2 })],
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it('ignores expiring inventory buildings and buildable buildings', () => {
    const old = cityBuilding('A_Old_1', 10);
    const expiring = buildingEx(
      { id: 'A_New_1', production: cityBuilding('x', 99).sourceBuilding.production },
      { expiration: 86400 },
    );
    const manufactory = cityBuilding('G_Mana_1', 99);

    const result = findClearUpgrades(
      [blockFor(old)],
      finderFor(old),
      [],
      [invItem(expiring, { id: 1 }), invItem(manufactory, { id: 2 })],
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it('groups identical city buildings into a single suggestion', () => {
    const old = cityBuilding('A_Old_1', 10);
    const candidate = cityBuilding('A_New_1', 20);
    const blocks = [blockFor(old, { id: 1 }), blockFor(old, { id: 2 })];

    const result = findClearUpgrades(blocks, finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].count).toBe(2);
    expect(result.suggestions[0].blockIds.sort()).toEqual([1, 2]);
  });

  it('compares evolving buildings at the stage reachable with owned artifacts', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Bear_1',
        base_name: 'A_Evt_Evo_Bear',
        width: 2,
        length: 2,
        production: {
          isSwitchable: false,
          products: [{ production_time: HOUR, revenue: { resources: { mana: 6 } } }],
        },
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [
      {
        baseName: 'A_Evt_Evo_Bear',
        artifactId: 'INS_EVO_BEAR',
        artifactCost: 1,
        stages: [{ id: 1 }, { id: 3, products: [{ index: 0, factor: 2 }] }],
      },
    ];
    const artifacts = invItem(undefined, { id: 7, subtype: 'INS_EVO_BEAR', amount: 2, type: 'Item' });
    const evoItem = invItem(evo, {
      id: 8,
      properties: [{ __class__: 'InventoryItemEvoBuildingPropertyVO', stage: 1 }],
      stage: 1,
    });

    // Stage 1 mana (144/day) does not beat 240/day; stage 3 (factor 2 -> 288/day) does.
    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [artifacts, evoItem]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].targetStage).toBe(3);
    expect(result.suggestions[0].artifactsNeeded).toBe(2);
    expect(result.suggestions[0].artifactsOwned).toBe(2);
    expect(result.suggestions[0].newValues.mana).toBe(288);
  });

  it('skips evolving buildings when the artifact association is missing', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Bear_1',
        base_name: 'A_Evt_Evo_Bear',
        production: cityBuilding('x', 99).sourceBuilding.production,
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [{ baseName: 'A_Evt_Evo_Bear', stages: [{ id: 1 }] }];

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [invItem(evo)]);

    expect(result.suggestions).toHaveLength(0);
    expect(result.skippedEvolvingItems).toBe(1);
  });

  it('skips evolving buildings whose stage products are not interpretable', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Bear_1',
        base_name: 'A_Evt_Evo_Bear',
        production: cityBuilding('x', 99).sourceBuilding.production,
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [
      {
        baseName: 'A_Evt_Evo_Bear',
        artifactId: 'INS_EVO_BEAR',
        artifactCost: 1,
        stages: [{ id: 1, products: [{ goodId: 'mana', value: 500 }] }],
      },
    ];

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [invItem(evo)]);

    expect(result.suggestions).toHaveLength(0);
    expect(result.skippedEvolvingItems).toBe(1);
  });

  it('reports both levels so a same-named upgrade can be told apart', () => {
    const old = cityBuilding('A_Ruins_3', 10);
    old.sourceBuilding.level = 3;
    const candidate = cityBuilding('A_Ruins_5', 20);
    candidate.name = old.name;
    candidate.sourceBuilding.level = 5;

    const result = findClearUpgrades([blockFor(old, { level: 3 })], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].oldLevel).toBe(3);
    expect(result.suggestions[0].newLevel).toBe(5);
  });

  it('never suggests replacing a placed evolving building', () => {
    const old = cityBuilding('A_Evt_Evo_Phoenix_1', 10);
    old.sourceBuilding.base_name = 'A_Evt_Evo_Phoenix';
    old.maxStage = 10;
    const evolving: StageProvision[] = [
      { baseName: 'A_Evt_Evo_Phoenix', artifactId: 'INS_EVO_PHOENIX', artifactCost: 1, stages: [{ id: 1 }] },
    ];
    const candidate = cityBuilding('A_New_1', 99);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('rejects candidates that would lose population', () => {
    const old = buildingEx({
      id: 'A_Old_1',
      production: { isSwitchable: false, products: [{ production_time: HOUR, revenue: { resources: { mana: 10 } } }] },
      provisions: { resources: { resources: { population: 100 } } },
    });
    const candidate = cityBuilding('A_New_1', 99);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('reports non-considered resources on both sides', () => {
    const old = buildingEx({
      id: 'A_Old_1',
      production: {
        isSwitchable: false,
        products: [{ production_time: HOUR, revenue: { resources: { mana: 10, money: 500 } } }],
      },
    });
    const candidate = buildingEx({
      id: 'A_New_1',
      production: {
        isSwitchable: false,
        products: [{ production_time: HOUR, revenue: { resources: { mana: 20, supplies: 100 } } }],
      },
    });

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(candidate)]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].oldOther).toEqual(['money']);
    expect(result.suggestions[0].newOther).toEqual(['supplies']);
  });
});
