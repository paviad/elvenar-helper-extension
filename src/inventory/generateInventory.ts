import { getBuildingFinder } from '../city/buildingFinder';
import { getAccountById } from '../elvenar/accountStore';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getFlexibleRewards } from '../elvenar/getFlexibleRewards';
import { getGoodDefinitions } from '../elvenar/getGoodsNames';
import { getItemDefinitions } from '../elvenar/getItemDefinitions';
import { getTomes } from '../elvenar/getTomes';
import { BuildingEx } from '../model/buildingEx';
import { InventoryItem } from '../model/inventoryItem';
import { ItemDefinition } from '../model/itemDefinition';
import { Reward, Tome } from '../model/tome';
import { getBuildingProvisionsAndProduction } from '../util/getBuildingProvisionsAndProduction';
import { FlexibleRewardContext, resolveFlexibleReward } from './flexibleRewards';
import { getFlexibleRewardGood, getTomeBuildings, isBuildingReward } from './tomeBuildings';

export interface GenerateInventoryOptions {
  /**
   * Also list, after each tome, what it can be opened for: only the buildings, or everything.
   * Left out by default, since a reward not yet chosen is not in hand. The Upgrade Finder
   * takes the buildings alone: it counts the artifacts in the inventory, and one inside a
   * tome is not one owned.
   */
  tomeContents?: 'buildings' | 'all';
}

export async function generateInventory(accountId: string, { tomeContents }: GenerateInventoryOptions = {}) {
  const accountData = getAccountById(accountId);
  if (!accountData || !accountData.inventoryItems) {
    return;
  }

  const inventoryItems = accountData.inventoryItems;

  const finder = getBuildingFinder();
  await finder.ensureInitialized();

  let academyLevel = 1;

  if (accountData.cityQuery) {
    const cityMap = accountData.cityQuery.cityEntities;
    const magicAcademy = cityMap.find((entity) => entity.type === 'academy');
    if (magicAcademy) {
      academyLevel = magicAcademy.level;
    }
  }

  const spellFragmentsFactor = (academyLevel - 1) * 0.25 + 1;

  // A tome's premium residence or workshop is named for the player's race.
  const race = accountData.cityQuery?.userData.race;

  const items = await getItemDefinitions();
  const tomes = await getTomes();
  const goods = tomeContents === 'all' ? await getGoodDefinitions() : [];
  const goodsNames = Object.fromEntries(goods.map(({ id, name }) => [id, name]));

  // A tome's flexible reward is sized to the chapter the player is in now.
  const flexibleRewardContext: FlexibleRewardContext = {
    flexibleRewards: tomeContents === 'all' ? await getFlexibleRewards() : [],
    chapter: accountData.cityQuery?.chapter,
    race,
    boostedGoods: accountData.cityQuery?.boostedGoods ?? [],
    goods,
  };

  const itemsDictionary = items.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, ItemDefinition>,
  );

  const tomesDictionary = tomes.reduce(
    (acc, tome) => {
      acc[tome.id] = tome;
      return acc;
    },
    {} as Record<string, Tome>,
  );

  function getTome(item: InventoryItem): Tome | undefined {
    return tomesDictionary[item.subtype];
  }

  function getItem(item: InventoryItem): ItemDefinition | undefined {
    return itemsDictionary[item.subtype];
  }

  function getBuilding(item: InventoryItem) {
    if (item.type !== 'city_entity') {
      return;
    }

    return finder.getBuildingExact(item.subtype);
  }

  function getResaleResources(building: BuildingEx): Record<string, number> {
    const resources = { ...building.resale_resources.resources };

    // delete resources['__class__'];

    return resources;
  }

  function getChapter(item: InventoryItem, building: BuildingEx | undefined): number | undefined {
    if (item.type === 'reward_selection_kit') {
      return item.properties.find((r) => r.__class__ === 'ChapterBasedInventoryItemPropertyVO')?.chapter;
    }

    if (item.type === 'city_entity') {
      const match = /_(\d+)$/.exec(item.subtype);
      if (match) {
        return parseInt(match[1], 10);
      }
      return undefined;
    }
  }

  const prettyTypes: Record<string, string> = {
    city_entity: 'Building',
    reward_selection_kit: 'Tome',
    item: 'Item',
    good: 'Good',
    flexible_reward: 'Choice',
  };

  function getPrettyType(type: string): string {
    return prettyTypes[type] || type;
  }

  /** What a tome can be opened for, typed apart from the same thing already in the inventory. */
  function getTomeRowType(type: string): string {
    return `${getPrettyType(type)} (Tome)`;
  }

  const tomeBuildingType = getTomeRowType('city_entity');

  const keysSet = new Set<string>();

  const evolvingBuildings = await getEvolvingBuildings();

  /**
   * A row for each building a tome can be opened for, at the chapter the tome was won in. A
   * building fresh out of a tome is at its first stage, as one built from the catalog would be.
   * The row keeps the tome's id: the tome is what would have to be opened to get the building.
   */
  function getTomeBuildingRows(tomeItem: InventoryItem, tome: Tome, chapter: number | undefined): InventoryItem[] {
    return getTomeBuildings(tome, chapter, race).map(({ buildingId, subType, amount }) => {
      const building = buildingId ? finder.getBuildingExact(buildingId) : undefined;
      const stage = building?.maxStage ? 1 : undefined;
      if (building) {
        const { provisions, production } = getBuildingProvisionsAndProduction(
          building,
          keysSet,
          evolvingBuildings,
          stage,
        );
        building.provisions = provisions;
        building.production = production;
      }
      let name = building?.name || buildingId || subType;

      if (stage) {
        name += ` (Stage ${stage})`;
      }

      return {
        ...tomeItem,
        type: tomeBuildingType,
        subtype: buildingId ?? subType,
        amount: tomeItem.amount * amount,
        name,
        resaleResources: (building && getResaleResources(building)) || {},
        chapter,
        spellFragments: Math.round((building?.spellFragments || 0) * spellFragmentsFactor) || undefined,
        size: (building && `${building.width}x${building.length}`) || undefined,
        stage,
        building,
        fromTome: tome.name,
      } satisfies InventoryItem;
    });
  }

  /** A good's name. The game names those of chapters still to come "!!Missing text" or "!!Dummy". */
  function getGoodName(id: string): string | undefined {
    const name = goodsNames[id];
    return name && !name.startsWith('!!') ? name : undefined;
  }

  function getRewardName(reward: Reward): string {
    if (reward.type === 'item') {
      return itemsDictionary[reward.subType]?.name || reward.subType;
    }
    if (reward.type === 'runeShard') {
      // The goods name a rune shard for its wonder.
      const wonder = getGoodName(reward.subType);
      return wonder ? `${wonder} Rune Shard` : reward.subType;
    }
    if (reward.type === 'flexible_reward') {
      const good = getFlexibleRewardGood(reward.subType);
      return (good && getGoodName(good)) || reward.subType;
    }
    return getGoodName(reward.subType) || reward.subType;
  }

  /** A quantity reads "800,000 Mana"; a multiplier, all a tome says of a flexible reward, "Mana ×10". */
  function getRewardLabel(reward: Reward, isMultiplier: boolean): string {
    const name = getRewardName(reward);
    const amount = reward.amount ?? 1;
    if (amount <= 1) {
      return name;
    }
    return isMultiplier ? `${name} ×${amount}` : `${amount.toLocaleString()} ${name}`;
  }

  /**
   * A row for each reward of a tome that is not a building. Each counts one pick, as the
   * tome offers it - 4 Royal Restoration - so a row's amount is the number of tomes. A
   * flexible reward is shown as what it comes to at the player's chapter; until the game has
   * described it, by the multiplier the tome names it with.
   */
  function getTomeRewardRows(tomeItem: InventoryItem, tome: Tome): InventoryItem[] {
    return (tome.rewards ?? [])
      .filter((reward) => !isBuildingReward(reward))
      .map((offered) => {
        const resolved =
          offered.type === 'flexible_reward' ? resolveFlexibleReward(offered, flexibleRewardContext) : undefined;
        const reward = resolved ?? offered;
        const amount = reward.amount ?? 1;
        const fragments = reward.type === 'item' ? Number(itemsDictionary[reward.subType]?.spellFragments) || 0 : 0;
        const isResaleResource = reward.subType === 'combiningcatalyst' || reward.subType === 'royalrestoration';

        return {
          ...tomeItem,
          type: getTomeRowType(offered.type),
          subtype: offered.subType,
          amount: tomeItem.amount,
          name: getRewardLabel(reward, offered.type === 'flexible_reward' && !resolved),
          resaleResources: isResaleResource ? { [reward.subType]: amount } : {},
          chapter: undefined,
          spellFragments: Math.round(fragments * amount * spellFragmentsFactor) || undefined,
          size: undefined,
          stage: undefined,
          building: undefined,
          fromTome: tome.name,
        } satisfies InventoryItem;
      });
  }

  const inventory = inventoryItems.flatMap((r) => {
    const building = getBuilding(r);
    const item = getItem(r);
    const tome = getTome(r);
    const fragments = building?.spellFragments || Number(item?.spellFragments) || tome?.spellFragments || 0;
    if (building) {
      const { provisions, production } = getBuildingProvisionsAndProduction(
        building,
        keysSet,
        evolvingBuildings,
        r.properties?.find((p) => p.__class__ === 'InventoryItemEvoBuildingPropertyVO')?.stage,
      );
      building.provisions = provisions;
      building.production = production;
    }
    const stage = r.properties?.find((p) => p.__class__ === 'InventoryItemEvoBuildingPropertyVO')?.stage;
    let name = building?.name || item?.name || tome?.name || r.subtype;

    if (stage) {
      name += ` (Stage ${stage})`;
    }

    const row = {
      ...r,
      type: getPrettyType(r.type),
      name,
      resaleResources: (building && getResaleResources(building)) || {},
      chapter: getChapter(r, building),
      spellFragments: Math.round(fragments * spellFragmentsFactor) || undefined,
      size: (building && `${building.width}x${building.length}`) || undefined,
      stage,
      building,
      transcendence: r.properties?.find((p) => p.__class__ === 'InventoryItemTranscendedBuildingPropertyVO'),
    } satisfies InventoryItem;

    if (!tomeContents || !tome) {
      return [row];
    }
    const buildingRows = getTomeBuildingRows(r, tome, row.chapter);
    return tomeContents === 'all' ? [row, ...buildingRows, ...getTomeRewardRows(r, tome)] : [row, ...buildingRows];
  });

  const sortedKeys = Array.from(keysSet).sort((a, b) => {
    const priority = ['population', 'culture', 'money', 'supplies'];
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return { inventory, allResourceKeys: sortedKeys };
}
