import { BuildingFinder } from '../city/buildingFinder';
import { getInventoryItems, sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import { getItemDefinitions, sendItemsQuery } from '../elvenar/sendItemsQuery';
import { getTomes, sendTomesQuery } from '../elvenar/sendTomesQuery';
import { BuildingEx } from '../model/buildingEx';
import { InventoryItem } from '../model/inventoryItem';
import { ItemDefinition } from '../model/itemDefinition';
import { Tome } from '../model/tome';

export async function generateInventory() {
  await sendInventoryQuery();
  await sendItemsQuery();
  await sendTomesQuery();
  const inventoryItems = getInventoryItems();

  const finder = new BuildingFinder();
  await finder.ensureInitialized();

  const items = getItemDefinitions();
  const tomes = getTomes();

  const itemsDictionary = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, ItemDefinition>);

  const tomesDictionary = tomes.reduce((acc, tome) => {
    acc[tome.id] = tome;
    return acc;
  }, {} as Record<string, Tome>);

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

    return finder.getBuilding(item.subtype);
  }

  function getResaleResources(building: BuildingEx): Record<string, number> {
    const resources = { ...building.resale_resources.resources };

    delete resources['__class__'];

    return resources;
  }

  function getChapter(item: InventoryItem): number | undefined {
    const match = /_(\d+)$/.exec(item.subtype);
    if (match) {
      return parseInt(match[1], 10);
    }
    return undefined;
  }

  const prettyTypes: Record<string, string> = {
    city_entity: 'Building',
    reward_selection_kit: 'Tome',
    item: 'Item',
  };

  function getPrettyType(type: string): string {
    return prettyTypes[type] || type;
  }

  const inventory = inventoryItems.map((r) => {
    const building = getBuilding(r);
    const item = getItem(r);
    const tome = getTome(r);
    return {
      ...r,
      type: getPrettyType(r.type),
      name: building?.name || item?.name || tome?.name || r.subtype,
      resaleResources: (building && getResaleResources(building)) || {},
      chapter: getChapter(r),
      spellFragments: building?.spellFragments || Number(item?.spellFragments) || undefined,
      size: (building && `${building.width}x${building.length}`) || undefined,
    } satisfies InventoryItem;
  });

  return inventory;
}
