import { getBuildings, sendBuildingsQuery } from '../elvenar/sendBuildingsQuery';
import { getCurrentChapter } from '../elvenar/sendCityDataQuery';
import { getInventoryItems, sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import { getItemDefinitions, sendItemsQuery } from '../elvenar/sendItemsQuery';
import { getTomes, sendTomesQuery } from '../elvenar/sendTomesQuery';
import { Building } from '../model/building';
import { InventoryItem } from '../model/inventoryItem';
import { ItemDefinition } from '../model/itemDefinition';
import { Tome } from '../model/tome';
import { findInElvenarchitect, initElvenarchitectData } from '../util/findInElvenArchitect';

export async function generateInventory() {
  await initElvenarchitectData();
  await sendInventoryQuery();
  await sendBuildingsQuery();
  await sendItemsQuery();
  await sendTomesQuery();
  const inventoryItems = getInventoryItems();
  const buildings = getBuildings();
  const items = getItemDefinitions();
  const tomes = getTomes();

  const buildingsDictionary = buildings.reduce((acc, building) => {
    acc[building.base_name] = acc[building.base_name] || [];
    acc[building.base_name].push(building);
    return acc;
  }, {} as Record<string, Building[]>);

  const itemsDictionary = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, ItemDefinition>);

  const tomesDictionary = tomes.reduce((acc, tome) => {
    acc[tome.id] = tome;
    return acc;
  }, {} as Record<string, Tome>);

  function findTome(item: InventoryItem): Tome | undefined {
    return tomesDictionary[item.subtype];
  }

  function getItem(item: InventoryItem): ItemDefinition | undefined {
    return itemsDictionary[item.subtype];
  }

  function getBuilding(item: InventoryItem): Building | undefined {
    if (item.type !== 'city_entity') {
      return undefined;
    }

    const subtypeBaseName = item.subtype.replace(/_\d+/, '');
    const buildings = buildingsDictionary[subtypeBaseName];
    if (!buildings || buildings.length === 0) {
      return undefined;
    }

    return buildings[0];
  }

  function getResaleResources(building: Building): Record<string, number> {
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
    const tome = findTome(r);
    return {
      ...r,
      type: getPrettyType(r.type),
      name: findInElvenarchitect(r.subtype) || building?.name || item?.name || tome?.name || r.subtype,
      resaleResources: (building && getResaleResources(building)) || {},
      chapter: getChapter(r),
      spellFragments: building?.spellFragments || Number(item?.spellFragments) || undefined,
    } satisfies InventoryItem;
  });

  return inventory;
}
