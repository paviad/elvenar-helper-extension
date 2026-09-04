import { InventoryItem } from '../model/inventoryItem';

/**
 * Names one inventory row to the city: an item by its id, and a building a tome can be opened
 * for by the tome's id with the building's own, since every building of one tome shares the
 * tome's id. A ref with no subtype names an item alone, never a building inside a tome.
 */
export interface InventoryRowRef {
  id: number;
  subtype?: string;
}

export function isInventoryRow(item: InventoryItem, ref: InventoryRowRef): boolean {
  if (item.id !== ref.id) {
    return false;
  }
  return ref.subtype === undefined ? !item.fromTome : item.subtype === ref.subtype;
}

/** What tells one inventory row from the others, for keys and grouping; see InventoryRowRef. */
export function getInventoryRowKey(item: InventoryItem): string {
  return item.fromTome ? `${item.id}:${item.subtype}` : String(item.id);
}
