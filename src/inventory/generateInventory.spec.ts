import { AccountData } from '../elvenar/Accounts';
import { getAccountById } from '../elvenar/accountStore';
import { getBuildings } from '../elvenar/getBuildings';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getExpirations } from '../elvenar/getExpirations';
import { getFlexibleRewards } from '../elvenar/getFlexibleRewards';
import { getGoodDefinitions } from '../elvenar/getGoodsNames';
import { getItemDefinitions } from '../elvenar/getItemDefinitions';
import { getPremiumBuildingHints } from '../elvenar/getPremiumBuildingHints';
import { getTomes } from '../elvenar/getTomes';
import { InventoryItem } from '../model/inventoryItem';
import { Tome } from '../model/tome';
import { makeBuilding } from '../testing/fixtures';
import { generateInventory } from './generateInventory';

jest.mock('../elvenar/accountStore', () => ({ getAccountById: jest.fn() }));
jest.mock('../elvenar/getBuildingPreviews');
jest.mock('../elvenar/getBuildings');
jest.mock('../elvenar/getEvolvingBuildings');
jest.mock('../elvenar/getExpirations');
jest.mock('../elvenar/getFlexibleRewards');
jest.mock('../elvenar/getGoodsNames');
jest.mock('../elvenar/getItemDefinitions');
jest.mock('../elvenar/getPremiumBuildingHints');
jest.mock('../elvenar/getTomes');

// The building finder is shared for the life of the module and reads the catalog once, so
// every case here runs against the same catalog: a set piece, an evolving building, and a
// fence the tome offers that the catalog does not know.
const catalog = [
  makeBuilding({
    id: 'A_Evt_Set_Redbeard_Cabin_18',
    name: "Redbeard's Cabin",
    type: 'culture',
    width: 2,
    length: 3,
    spellFragments: 40,
    resale_resources: { resources: { combiningcatalyst: 2, royalrestoration: 1 } },
    provisions: { resources: { resources: { culture: 120, population: 30 } } },
  }),
  makeBuilding({
    id: 'A_Evt_Evo_Redbeard_Ship_18',
    name: "Redbeard's Ship",
    type: 'culture',
    width: 4,
    length: 4,
    provisions: { resources: { resources: { culture: 200 } } },
  }),
];

const tome: Tome = {
  id: 'rsk_set_redbeard_xxiii',
  name: "Redbeard's Tome",
  description: '',
  rarity: 1,
  spellFragments: 50,
  iconId: 'rsk',
  type: 'set',
  rewards: [
    { type: 'building', subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 },
    { type: 'building', subType: 'A_Evt_Evo_Redbeard_Ship${chapter}', amount: 1 },
    { type: 'building', subType: 'A_Evt_Set_Redbeard_Fence${chapter}', amount: 2 },
    { type: 'item', subType: 'INS_EVO_REDBEARD', amount: 3 },
    { type: 'good', subType: 'royalrestoration', amount: 4 },
    { type: 'good', subType: 'volatile_sigils', amount: 20 },
    { type: 'flexible_reward', subType: 'frog_mana_RSK', amount: 10 },
    { type: 'flexible_reward', subType: 'frog_defaultpremium', amount: 1 },
  ],
};

const tomeItem: InventoryItem = {
  id: 501,
  amount: 2,
  type: 'reward_selection_kit',
  subtype: 'rsk_set_redbeard_xxiii',
  changedAt: 1_700_000_000,
  properties: [{ __class__: 'ChapterBasedInventoryItemPropertyVO', chapter: 18 }],
};

const cabinItem: InventoryItem = {
  id: 502,
  amount: 1,
  type: 'city_entity',
  subtype: 'A_Evt_Set_Redbeard_Cabin_18',
  changedAt: 1_700_000_001,
  properties: [],
};

beforeEach(() => {
  jest.mocked(getBuildings).mockResolvedValue(catalog);
  jest.mocked(getEvolvingBuildings).mockResolvedValue([
    {
      baseName: 'A_Evt_Evo_Redbeard_Ship',
      stages: [
        { id: 1, culture: 0.5 },
        { id: 10, culture: 2 },
      ],
    },
  ]);
  jest.mocked(getExpirations).mockResolvedValue({});
  jest.mocked(getPremiumBuildingHints).mockResolvedValue([]);
  jest.mocked(getItemDefinitions).mockResolvedValue([
    {
      id: 'INS_EVO_REDBEARD',
      rarity: 5,
      name: 'Redbeard Artifact',
      description: '',
      effectConfigId: 1,
      level: 1,
      spellFragments: '1000',
    },
  ]);
  jest.mocked(getGoodDefinitions).mockResolvedValue([
    { id: 'royalrestoration', name: 'Royal Restoration' },
    { id: 'mana', name: 'Mana' },
    { id: 'b_ch1_aw1_shards', name: '!!Missing text' },
    { id: 'b_ch2_aw1_shards', name: 'Blossom Temple' },
    { id: 'marble', name: 'Marble', type: 'common', quality: 1, chain: 1 },
    { id: 'steel', name: 'Steel', type: 'common', quality: 1, chain: 2 },
  ]);
  jest.mocked(getFlexibleRewards).mockResolvedValue([
    {
      id: 'frog_mana_RSK',
      rewards: [
        { type: 'good', subType: 'boosted_plus_1_quality_1', amount: 63 },
        { type: 'resource', subType: 'mana', amount: 3200 },
      ],
    },
    {
      id: 'frog_defaultpremium',
      rewards: [
        { type: 'runeShard', subType: 'b_ch1_aw1_shards', amount: 1 },
        { type: 'runeShard', subType: 'b_ch2_aw1_shards', amount: 1 },
      ],
    },
  ]);
  jest.mocked(getTomes).mockResolvedValue([tome]);
  jest.mocked(getAccountById).mockReturnValue({ inventoryItems: [tomeItem, cabinItem] } as unknown as AccountData);
});

async function inventoryRows(options?: Parameters<typeof generateInventory>[1]) {
  const result = await generateInventory('account', options);
  if (!result) {
    throw new Error('no inventory');
  }
  return result.inventory;
}

describe('generateInventory', () => {
  it('lists a tome as one row unless asked for its buildings', async () => {
    const rows = await inventoryRows();

    expect(rows.map((r) => [r.type, r.name])).toEqual([
      ['Tome', "Redbeard's Tome"],
      ['Building', "Redbeard's Cabin"],
    ]);
  });

  it('lists the buildings a tome can be opened for after it, at the chapter it was won in', async () => {
    const rows = await inventoryRows({ tomeContents: 'buildings' });

    expect(rows.map((r) => [r.type, r.name])).toEqual([
      ['Tome', "Redbeard's Tome"],
      ['Building (Tome)', "Redbeard's Cabin"],
      ['Building (Tome)', "Redbeard's Ship (Stage 1)"],
      ['Building (Tome)', 'A_Evt_Set_Redbeard_Fence_18'],
      ['Building', "Redbeard's Cabin"],
    ]);

    const cabin = rows[1];
    expect(cabin).toMatchObject({
      id: 501,
      subtype: 'A_Evt_Set_Redbeard_Cabin_18',
      chapter: 18,
      amount: 2,
      size: '2x3',
      spellFragments: 40,
      resaleResources: { combiningcatalyst: 2, royalrestoration: 1 },
      fromTome: "Redbeard's Tome",
    });
    expect(cabin.building?.provisions).toEqual({ culture: 120, population: 30 });
  });

  it('brings an evolving building out at its first stage', async () => {
    const rows = await inventoryRows({ tomeContents: 'buildings' });

    const ship = rows[2];
    expect(ship.stage).toBe(1);
    expect(ship.building?.provisions).toEqual({ culture: 100 });
  });

  it('names a building the catalog does not know after its id, with what the tome would yield', async () => {
    const rows = await inventoryRows({ tomeContents: 'buildings' });

    const fence = rows[3];
    expect(fence).toMatchObject({ name: 'A_Evt_Set_Redbeard_Fence_18', amount: 4, fromTome: "Redbeard's Tome" });
    expect(fence.building).toBeUndefined();
    expect(fence.size).toBeUndefined();
    expect(fence.spellFragments).toBeUndefined();
  });

  it('leaves the tome itself and the buildings already in the inventory as they were', async () => {
    const rows = await inventoryRows({ tomeContents: 'buildings' });

    expect(rows[0]).toMatchObject({ id: 501, type: 'Tome', chapter: 18, spellFragments: 50 });
    expect(rows[0].fromTome).toBeUndefined();
    expect(rows[4]).toMatchObject({ id: 502, type: 'Building', chapter: 18, amount: 1 });
    expect(rows[4].fromTome).toBeUndefined();
  });

  it('counts the resources of a tome building into the resource keys', async () => {
    const result = await generateInventory('account', { tomeContents: 'buildings' });

    expect(result?.allResourceKeys).toEqual(['population', 'culture']);
  });

  it('lists the rest of what a tome holds after its buildings when asked for everything', async () => {
    const rows = await inventoryRows({ tomeContents: 'all' });

    expect(rows.map((r) => [r.type, r.name])).toEqual([
      ['Tome', "Redbeard's Tome"],
      ['Building (Tome)', "Redbeard's Cabin"],
      ['Building (Tome)', "Redbeard's Ship (Stage 1)"],
      ['Building (Tome)', 'A_Evt_Set_Redbeard_Fence_18'],
      ['Item (Tome)', '3 Redbeard Artifact'],
      ['Good (Tome)', '4 Royal Restoration'],
      ['Good (Tome)', '20 volatile_sigils'],
      ['Choice (Tome)', 'Mana ×10'],
      ['Choice (Tome)', 'frog_defaultpremium'],
      ['Building', "Redbeard's Cabin"],
    ]);
  });

  it('counts each reward that is not a building as one pick per tome, with no building columns', async () => {
    const rows = await inventoryRows({ tomeContents: 'all' });

    const artifact = rows[4];
    expect(artifact).toMatchObject({
      id: 501,
      subtype: 'INS_EVO_REDBEARD',
      amount: 2,
      spellFragments: 3000,
      resaleResources: {},
      fromTome: "Redbeard's Tome",
    });
    expect(artifact.chapter).toBeUndefined();
    expect(artifact.size).toBeUndefined();
    expect(artifact.building).toBeUndefined();
  });

  it('puts the Royal Restoration a tome offers in the resale resources', async () => {
    const rows = await inventoryRows({ tomeContents: 'all' });

    expect(rows[5].resaleResources).toEqual({ royalrestoration: 4 });
    expect(rows[6].resaleResources).toEqual({});
    expect(rows[7]).toMatchObject({ subtype: 'frog_mana_RSK', amount: 2, resaleResources: {} });
  });

  it("shows a flexible reward as what it comes to at the player's chapter", async () => {
    jest.mocked(getAccountById).mockReturnValue({
      inventoryItems: [tomeItem],
      cityQuery: { chapter: 2, boostedGoods: ['marble'], cityEntities: [], userData: { race: 'elves' } },
    } as unknown as AccountData);

    const rows = await inventoryRows({ tomeContents: 'all' });

    expect(rows.filter((r) => r.type === 'Choice (Tome)')).toMatchObject([
      { subtype: 'frog_mana_RSK', name: `${(32000).toLocaleString()} Mana`, amount: 2 },
      { subtype: 'frog_defaultpremium', name: 'Blossom Temple Rune Shard', amount: 2 },
    ]);
  });

  it('fills the boosted good into a flexible reward, and names a shard the game has no name for yet by its id', async () => {
    jest.mocked(getAccountById).mockReturnValue({
      inventoryItems: [tomeItem],
      cityQuery: { chapter: 1, boostedGoods: ['marble'], cityEntities: [], userData: { race: 'elves' } },
    } as unknown as AccountData);

    const rows = await inventoryRows({ tomeContents: 'all' });

    expect(rows.filter((r) => r.type === 'Choice (Tome)').map((r) => r.name)).toEqual([
      '630 Steel',
      'b_ch1_aw1_shards',
    ]);
  });

  it("fills the player's race into a premium building the tome offers", async () => {
    jest.mocked(getTomes).mockResolvedValue([
      {
        ...tome,
        id: 'rsk_premium',
        name: 'Premium Tome',
        rewards: [{ type: 'building', subType: 'R_${race}_Premium_Residential${chapter}', amount: 1 }],
      },
    ]);
    jest.mocked(getAccountById).mockReturnValue({
      inventoryItems: [{ ...tomeItem, subtype: 'rsk_premium' }],
      cityQuery: { cityEntities: [], userData: { race: 'elves' } },
    } as unknown as AccountData);

    const rows = await inventoryRows({ tomeContents: 'buildings' });

    expect(rows[1]).toMatchObject({ type: 'Building (Tome)', subtype: 'R_Elves_Premium_Residential_18' });
  });
});
