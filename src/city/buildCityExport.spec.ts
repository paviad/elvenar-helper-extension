import { InventoryItem } from '../model/inventoryItem';
import { makeCityBlock, makeCityEntityEx } from '../testing/fixtures';
import { buildCityExport, toHelpEnd } from './buildCityExport';

const NOW = 1_786_309_197_407;

function invItem(subtype: string, amount: number): InventoryItem {
  return { id: 1, amount, type: 'item', subtype, changedAt: 0, properties: [] };
}

function exportWith(overrides: Partial<Parameters<typeof buildCityExport>[0]> = {}) {
  return buildCityExport({
    blocks: [],
    unlockedAreas: [],
    race: 'humans',
    chapter: 25,
    resources: {},
    inventoryItems: [],
    enchantmentsEnd: {},
    helpEnd: {},
    now: NOW,
    ...overrides,
  });
}

describe('buildCityExport', () => {
  it('stamps the schema version and export time in epoch seconds', () => {
    const result = exportWith();

    expect(result.schema_version).toBe(2);
    expect(result.exported_at).toBe(Math.floor(NOW / 1000));
  });

  it('carries the chapter research graph, and leaves the block out without one', () => {
    const research = {
      chapter: 25,
      technologies: [
        {
          id: 'humans_ch25_barracks',
          state: 'available' as const,
          kp_cost: 120,
          kp_missing: 120,
          costs: { finity_gear: 2000 },
          parents: ['humans_ch25_mainhall_1'],
        },
      ],
    };

    expect(exportWith({ research }).research).toEqual(research);
    expect(exportWith().research).toBeUndefined();
  });

  it('names the chapter the city is in', () => {
    expect(exportWith({ chapter: 25 }).user_data.chapter).toBe(25);
    expect(exportWith({ chapter: 24 }).user_data.chapter).toBe(24);
  });

  it('leaves the chapter out when the stored city has no usable one', () => {
    expect(exportWith({ chapter: undefined }).user_data).toEqual({ race: 'humans' });
    expect(exportWith({ chapter: 0 }).user_data.chapter).toBeUndefined();
  });

  it('keeps the v1 city_map and user_data shape', () => {
    const entity = makeCityEntityEx({ cityentity_id: 'B_Ch25_MSB_1', id: 4711, level: 3, stage: 2 });
    const unlockedAreas = [{ x: 15, y: 0, width: 10, length: 15 }];

    const result = exportWith({
      blocks: [makeCityBlock({ entity, x: 12, y: 34, type: 'production_x' })],
      unlockedAreas,
      race: 'elves',
    });

    expect(result.user_data).toEqual({ race: 'elves', chapter: 25 });
    expect(result.city_map.unlocked_areas).toBe(unlockedAreas);
    expect(result.city_map.entities).toEqual([
      {
        id: 1,
        cityentity_id: 'B_Ch25_MSB_1',
        x: 12,
        y: 34,
        stage: 2,
        // the _x/_y placement suffix is not part of the format
        type: 'production',
        level: 3,
        expires_at: undefined,
        enchanted_until: undefined,
        helped_until: undefined,
      },
    ]);
  });

  it('exports expiry, enchantment and help end times as epoch seconds', () => {
    const expiring = makeCityEntityEx({ id: 18788, type: 'expiring' });
    const enchanted = makeCityEntityEx({ id: 13287, type: 'goods' });

    const result = exportWith({
      blocks: [
        makeCityBlock({ entity: expiring, type: 'expiring', expirationEnd: 1_786_500_000_000 }),
        makeCityBlock({ entity: enchanted, type: 'goods' }),
      ],
      enchantmentsEnd: { '13287': 1_786_309_197_407 },
      helpEnd: { '13287': 1_786_327_477_407 },
    });

    expect(result.city_map.entities[0].expires_at).toBe(1_786_500_000);
    expect(result.city_map.entities[0].enchanted_until).toBeUndefined();
    expect(result.city_map.entities[0].helped_until).toBeUndefined();
    expect(result.city_map.entities[1].enchanted_until).toBe(1_786_309_197);
    expect(result.city_map.entities[1].helped_until).toBe(1_786_327_477);
    expect(result.city_map.entities[1].expires_at).toBeUndefined();
  });

  it('keys help end times by entity id, the way the EE tab looks them up', () => {
    expect(
      toHelpEnd([
        { id: 18638, remainingTime: 65326, endTime: 1_786_327_477_407 },
        { id: 12614, remainingTime: 65380, endTime: 1_786_327_531_407 },
      ]),
    ).toEqual({ '18638': 1_786_327_477_407, '12614': 1_786_327_531_407 });
    expect(toHelpEnd(undefined)).toEqual({});
  });

  it('reads the resources block off the game resource bag', () => {
    const result = exportWith({
      resources: {
        nox: 10907,
        eldian_sapphire: 81,
        prosperity: 1973,
        required_prosperity: 1538,
        ch25_wisdom_life: 1,
        ch25_wisdom_kid: 7,
        ch25_wisdom_adult: 7,
        ch25_wisdom_elder: 7,
      },
    });

    expect(result.resources).toEqual({
      nox: 10907,
      eldian_sapphires: 81,
      prosperity_available: 1973,
      prosperity_total: 3511,
      wisdom_of_life: 1,
      wisdom_of_youth: 7,
      wisdom_of_adults: 7,
      wisdom_of_age: 7,
    });
  });

  it('omits resource keys the game did not send rather than exporting a zero', () => {
    const result = exportWith({ resources: { nox: 10907 } });

    expect(result.resources).toEqual({ nox: 10907 });
    expect(result.resources).not.toHaveProperty('wisdom_of_life');
    expect(result.resources).not.toHaveProperty('prosperity_available');
  });

  it('drops the resources block entirely when nothing is sourceable', () => {
    expect(exportWith({ resources: { money: 5 } }).resources).toBeUndefined();
  });

  it('still reports prosperity_total when the city has spent none of it', () => {
    expect(exportWith({ resources: { prosperity: 1973 } }).resources).toEqual({
      prosperity_available: 1973,
      prosperity_total: 1973,
    });
  });

  it('keys time boosters by duration in hours and sums duplicate rows', () => {
    const result = exportWith({
      inventoryItems: [
        invItem('INS_TR_AMT_10', 240),
        invItem('INS_TR_AMT_15', 60),
        invItem('INS_TR_AMT_30', 100),
        invItem('INS_TR_AMT_30', 18),
        invItem('INS_TR_AMT_45', 22),
        invItem('INS_TR_AMT_60', 69),
        invItem('INS_TR_AMT_1200', 6),
        invItem('INS_KP_AW_20', 50),
      ],
    });

    expect(result.inventory?.time_boosters).toEqual({
      '0.1667': 240,
      '0.25': 60,
      '0.5': 118,
      '0.75': 22,
      '1': 69,
      '20': 6,
    });
  });

  it('exports the Generous Guests stock off the resource bag', () => {
    expect(exportWith({ resources: { spell_settlement_production_boost_1: 78 } }).inventory).toEqual({
      generous_guests: 78,
    });
  });

  it('collapses Portal Profits into whole portal productions', () => {
    const result = exportWith({
      inventoryItems: [
        invItem('INS_RF_GRR_5', 787),
        invItem('INS_RF_GRR_10', 417),
        invItem('INS_RF_GRR_15', 4),
        invItem('INS_RF_GRR_25', 4),
        invItem('INS_RF_GRR_50', 4),
        invItem('INS_RF_SPL_5', 395),
      ],
    });

    // (787x5 + 417x10 + 4x15 + 4x25 + 4x50) / 100, with the supply refill left out
    expect(result.inventory).toEqual({ portal_profits: 85 });
  });

  it('drops the inventory block when nothing in it is sourceable', () => {
    expect(exportWith().inventory).toBeUndefined();
  });

  it('totals the Wisdoms for the progress block', () => {
    const result = exportWith({
      resources: { ch25_wisdom_life: 1, ch25_wisdom_kid: 7, ch25_wisdom_adult: 7, ch25_wisdom_elder: 7 },
    });

    expect(result.progress).toEqual({ wisdom_of_life_earned: 1, wisdoms_produced: 21 });
    expect(exportWith().progress).toBeUndefined();
  });

  it('survives a JSON round trip with the absent keys stripped', () => {
    const parsed = JSON.parse(
      JSON.stringify(
        exportWith({
          blocks: [makeCityBlock({ entity: makeCityEntityEx({ id: 9 }) })],
          resources: { nox: 10907 },
        }),
      ),
    ) as Record<string, unknown>;

    expect(parsed).not.toHaveProperty('inventory');
    expect(parsed).not.toHaveProperty('progress');
    expect(Object.keys((parsed.city_map as { entities: object[] }).entities[0])).not.toContain('expires_at');
  });
});
