import { BuildingFinder } from '../city/buildingFinder';
import { getAccountById } from '../elvenar/AccountManager';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getItemDefinitions } from '../elvenar/getItemDefinitions';
import { getTomes } from '../elvenar/getTomes';
import { BuildingEx } from '../model/buildingEx';
import { InventoryItem } from '../model/inventoryItem';
import { ItemDefinition } from '../model/itemDefinition';
import { Tome } from '../model/tome';
import { getBuildingProvisionsAndProduction } from '../util/getBuildingProvisionsAndProduction';

export async function generateInventory(accountId: string) {
  const accountData = getAccountById(accountId);
  if (!accountData || !accountData.inventoryItems) {
    return;
  }

  const inventoryItems = accountData.inventoryItems;

  const finder = new BuildingFinder();
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

  const items = await getItemDefinitions();
  const tomes = await getTomes();

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
  };

  function getPrettyType(type: string): string {
    return prettyTypes[type] || type;
  }

  const keysSet = new Set<string>();

  const evolvingBuildings = await getEvolvingBuildings();

  const inventory = inventoryItems.map((r) => {
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

    return {
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
