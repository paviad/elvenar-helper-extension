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
    const old = cityBuilding('A_Old_1', 10, 0, [3, 3]);
    const candidate = cityBuilding('A_New_1', 10, 0, [2, 2]);

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

  it('names evolving buildings skipped for a missing artifact association', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Bear_1',
        name: 'Evolving Bear',
        base_name: 'A_Evt_Evo_Bear',
        production: cityBuilding('x', 99).sourceBuilding.production,
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [{ baseName: 'A_Evt_Evo_Bear', stages: [{ id: 1 }] }];

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [invItem(evo)]);

    expect(result.suggestions).toHaveLength(0);
    expect(result.skippedMissingArtifact).toEqual(['Evolving Bear']);
  });

  it('does not report a skipped building that produces nothing it tracks', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Coin_1',
        name: 'Coin Bear',
        base_name: 'A_Evt_Evo_Coin',
        production: {
          isSwitchable: false,
          products: [{ production_time: HOUR, revenue: { resources: { money: 500 } } }],
        },
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [{ baseName: 'A_Evt_Evo_Coin', stages: [{ id: 1 }] }];

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [invItem(evo)]);

    expect(result.skippedMissingArtifact).toEqual([]);
  });

  it('reports each skipped building once, however many copies are held', () => {
    const old = cityBuilding('A_Old_1', 10);
    const evo = buildingEx(
      {
        id: 'A_Evt_Evo_Bear_1',
        name: 'Evolving Bear',
        base_name: 'A_Evt_Evo_Bear',
        production: cityBuilding('x', 99).sourceBuilding.production,
      },
      { maxStage: 10 },
    );
    const evolving: StageProvision[] = [{ baseName: 'A_Evt_Evo_Bear', stages: [{ id: 1 }] }];

    const result = findClearUpgrades([blockFor(old)], finderFor(old), evolving, [
      invItem(evo, { id: 1, stage: 1 }),
      invItem(evo, { id: 2, stage: 4 }),
    ]);

    expect(result.skippedMissingArtifact).toEqual(['Evolving Bear']);
  });

  describe('stage products', () => {
    /** Two-slot building: slot 0 makes mana, slot 1 makes seeds, both 10/hour. */
    const twoSlot = () =>
      buildingEx(
        {
          id: 'A_Evt_Evo_Bear_1',
          name: 'Evolving Bear',
          base_name: 'A_Evt_Evo_Bear',
          width: 2,
          length: 2,
          production: {
            isSwitchable: false,
            products: [
              { production_time: HOUR, revenue: { resources: { mana: 10 } } },
              { production_time: HOUR, revenue: { resources: { seeds: 10 } } },
            ],
          },
        },
        { maxStage: 10 },
      );

    const evolvingWith = (products: StageProvision['stages'][number]['products']): StageProvision[] => [
      { baseName: 'A_Evt_Evo_Bear', artifactId: 'INS_EVO_BEAR', artifactCost: 1, stages: [{ id: 1, products }] },
    ];

    const valuesFor = (evolving: StageProvision[]) => {
      // A trivial city building, so the bear always dominates and a row always appears.
      const old = cityBuilding('A_Old_1', 1);
      const item = invItem(twoSlot(), { stage: 1 });
      return findClearUpgrades([blockFor(old)], finderFor(old), evolving, [item]).suggestions[0]?.newValues;
    };

    it('applies a factor to the slot it names, defaulting the index to 0', () => {
      expect(valuesFor(evolvingWith([{ factor: 2 }, { index: 1, factor: 3 }]))).toEqual({ mana: 480, seeds: 720 });
    });

    it('treats a slot listed without a factor as not yet unlocked', () => {
      // How the live data marks a locked slot: the Dragonsnail's fourth slot stays bare
      // until stage 8, where it appears at factor 1.
      expect(valuesFor(evolvingWith([{ factor: 1 }, { index: 1 }]))).toEqual({ mana: 240 });
    });

    it('treats a slot paid out as a flat item reward as contributing nothing here', () => {
      expect(valuesFor(evolvingWith([{ factor: 1 }, { index: 1, goodId: 'INS_RF_SPL_5', value: 1 }]))).toEqual({
        mana: 240,
      });
    });

    it('leaves a slot the stage does not mention at its catalog value', () => {
      expect(valuesFor(evolvingWith([{ factor: 2 }]))).toEqual({ mana: 480, seeds: 240 });
    });

    it('leaves every slot at its catalog value when the stage lists no products', () => {
      expect(valuesFor(evolvingWith(undefined))).toEqual({ mana: 240, seeds: 240 });
    });
  });

  it('ignores chapter Guardians on both sides', () => {
    const guardian = cityBuilding('B_Guardian_XXV_Naturion_1', 10);
    guardian.sourceBuilding.base_name = 'B_Guardian_XXV_Naturion';
    const candidate = cityBuilding('A_New_1', 99);
    const old = cityBuilding('A_Old_1', 10);
    const guardianItem = cityBuilding('B_Guardian_XXVI_Ursalith_1', 99);
    guardianItem.sourceBuilding.base_name = 'B_Guardian_XXVI_Ursalith';

    const asCity = findClearUpgrades([blockFor(guardian)], finderFor(guardian), [], [invItem(candidate)]);
    const asItem = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(guardianItem)]);

    expect(asCity.suggestions).toHaveLength(0);
    expect(asItem.suggestions).toHaveLength(0);
  });

  it('never suggests replacing an expiring city building', () => {
    const byCatalog = cityBuilding('A_Tent_1', 10);
    byCatalog.sourceBuilding.type = 'expiring';
    byCatalog.type = 'expiring';
    const byBlock = cityBuilding('A_Hut_1', 10);
    const candidate = cityBuilding('A_New_1', 20);

    const catalogResult = findClearUpgrades([blockFor(byCatalog)], finderFor(byCatalog), [], [invItem(candidate)]);
    // A block the game gave a deadline to, whose catalog entry does not say 'expiring'.
    const blockResult = findClearUpgrades(
      [blockFor(byBlock, { expirationEnd: 1_000 })],
      finderFor(byBlock),
      [],
      [invItem(candidate)],
    );

    expect(catalogResult.suggestions).toHaveLength(0);
    expect(blockResult.suggestions).toHaveLength(0);
  });

  it('never suggests replacing a set building', () => {
    const flagged = cityBuilding('A_Set_1', 10);
    flagged.sourceBuilding.isSetBuilding = true;
    const byStrategy = cityBuilding('A_Set_2', 10);
    byStrategy.connectionStrategy = 'set_buildings';
    const candidate = cityBuilding('A_New_1', 99);

    const result = findClearUpgrades(
      [blockFor(flagged, { id: 1 }), blockFor(byStrategy, { id: 2 })],
      finderFor(flagged, byStrategy),
      [],
      [invItem(candidate)],
    );

    expect(result.suggestions).toHaveLength(0);
  });

  it('rejects a 1xN replacement for a building that is thicker than one tile', () => {
    const old = cityBuilding('A_Old_1', 10);
    const thin = cityBuilding('A_New_1', 99, 0, [1, 2]);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(thin)]);

    expect(result.suggestions).toHaveLength(0);
  });

  it('allows a 1xN replacement when the city building is itself 1xN', () => {
    const old = cityBuilding('A_Old_1', 10, 0, [1, 4]);
    const thin = cityBuilding('A_New_1', 30, 0, [1, 4]);

    const result = findClearUpgrades([blockFor(old)], finderFor(old), [], [invItem(thin)]);

    expect(result.suggestions).toHaveLength(1);
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
