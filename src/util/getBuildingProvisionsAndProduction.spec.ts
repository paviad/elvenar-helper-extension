import { BuildingEx } from '../model/buildingEx';
import { StageProvision } from '../model/stageProvision';
import { makeBuilding } from '../testing/fixtures';
import { getBuildingProvisionsAndProduction } from './getBuildingProvisionsAndProduction';

const HOUR = 3_600;

function buildingEx(sourceOverrides: Parameters<typeof makeBuilding>[0] = {}): BuildingEx {
  const sourceBuilding = makeBuilding(sourceOverrides);
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
  };
}

describe('provisions', () => {
  it('collects provisions and records their keys', () => {
    const keys = new Set<string>();
    const building = buildingEx({
      provisions: { resources: { resources: { population: 120, culture: 30 } } },
    });

    const { provisions } = getBuildingProvisionsAndProduction(building, keys, []);

    expect(provisions).toEqual({ population: 120, culture: 30 });
    expect([...keys].sort()).toEqual(['culture', 'population']);
  });

  it('excludes prosperity and non-positive values', () => {
    const keys = new Set<string>();
    const building = buildingEx({
      provisions: { resources: { resources: { population: 0, culture: 30, prosperity: 500 } } },
    });

    const { provisions } = getBuildingProvisionsAndProduction(building, keys, []);

    expect(provisions).toEqual({ culture: 30 });
    expect(keys.has('prosperity')).toBe(false);
  });

  it('scales culture and population by the matching evolution stage', () => {
    const evolving: StageProvision[] = [{ baseName: 'G_Steel', stages: [{ id: 2, culture: 1.5, population: 2 }] }];
    const building = buildingEx({
      provisions: { resources: { resources: { population: 100, culture: 101 } } },
    });

    const { provisions } = getBuildingProvisionsAndProduction(building, new Set(), evolving, 2);

    // culture is floored after scaling: 101 * 1.5 = 151.5
    expect(provisions).toEqual({ population: 200, culture: 151 });
  });

  it('leaves values unscaled when the stage does not match', () => {
    const evolving: StageProvision[] = [{ baseName: 'G_Steel', stages: [{ id: 2, culture: 1.5, population: 2 }] }];
    const building = buildingEx({
      provisions: { resources: { resources: { population: 100 } } },
    });

    const { provisions } = getBuildingProvisionsAndProduction(building, new Set(), evolving, 9);

    expect(provisions).toEqual({ population: 100 });
  });

  it('returns an empty result for a building with no provisions', () => {
    const { provisions } = getBuildingProvisionsAndProduction(buildingEx(), new Set(), []);

    expect(provisions).toEqual({});
  });
});

describe('production', () => {
  it('normalises output to a 24 hour day', () => {
    const keys = new Set<string>();
    const building = buildingEx({
      production: {
        isSwitchable: false,
        products: [{ production_time: HOUR, revenue: { resources: { mana: 10 } } }],
      },
    });

    const { production } = getBuildingProvisionsAndProduction(building, keys, []);

    expect(production).toEqual({ mana: 240 });
    expect([...keys]).toEqual(['mana']);
  });

  it('only counts the settlement resources it knows about', () => {
    const building = buildingEx({
      production: {
        isSwitchable: false,
        products: [
          {
            production_time: HOUR,
            revenue: { resources: { mana: 1, orcs: 1, seeds: 1, unurium: 1, nox: 1, money: 999, steel: 999 } },
          },
        ],
      },
    });

    const { production } = getBuildingProvisionsAndProduction(building, new Set(), []);

    expect(Object.keys(production).sort()).toEqual(['mana', 'nox', 'orcs', 'seeds', 'unurium']);
  });

  it('keeps the best option per resource rather than summing switchable products', () => {
    const building = buildingEx({
      production: {
        isSwitchable: true,
        products: [
          { production_time: HOUR, revenue: { resources: { mana: 10 } } },
          { production_time: HOUR, revenue: { resources: { mana: 25 } } },
          { production_time: HOUR, revenue: { resources: { mana: 5 } } },
        ],
      },
    });

    const { production } = getBuildingProvisionsAndProduction(building, new Set(), []);

    expect(production).toEqual({ mana: 25 * 24 });
  });

  it('skips products with no usable production time', () => {
    const building = buildingEx({
      production: {
        isSwitchable: false,
        products: [
          { revenue: { resources: { mana: 10 } } },
          { production_time: 0, revenue: { resources: { orcs: 10 } } },
        ],
      },
    });

    const { production } = getBuildingProvisionsAndProduction(building, new Set(), []);

    expect(production).toEqual({});
  });
});
