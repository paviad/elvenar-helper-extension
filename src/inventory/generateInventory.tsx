import { getBuildings, sendBuildingsQuery } from '../elvenar/sendBuildingsQuery';
import { getCurrentChapter } from '../elvenar/sendCityDataQuery';
import { getInventoryItems, sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import { Building } from '../model/building';
import { InventoryItem } from '../model/inventoryItem';
import { findInElvenarchitect, initElvenarchitectData } from '../util/findInElvenArchitect';

export async function generateInventory() {
  await initElvenarchitectData();
  await sendInventoryQuery();
  await sendBuildingsQuery();
  const inventoryItems = getInventoryItems();
  const buildings = getBuildings();

  const buildingsDictionary = buildings.reduce((acc, building) => {
    acc[building.base_name] = acc[building.base_name] || [];
    acc[building.base_name].push(building);
    return acc;
  }, {} as Record<string, Building[]>);

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
    return {
      ...r,
      type: getPrettyType(r.type),
      name: findInElvenarchitect(r.subtype) || building?.name || r.subtype,
      resaleResources: (building && getResaleResources(building)) || {},
      chapter: getChapter(r),
    } satisfies InventoryItem;
  });

  console.log('Generated inventory items:', inventory);

  return inventory;
}
