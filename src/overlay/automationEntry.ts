/**
 * One job the Production tab keeps going: a set of buildings, and the option to start on them
 * whenever they come free. The entries are kept in the overlay store, so they outlive a refresh -
 * whether monitoring is running deliberately is not, and a refresh always comes back stopped.
 */
export interface AutomationEntry {
  /** Stable across edits, so the list keeps its order and its rows keep their identity. */
  id: string;
  /** What it is: the product's name when the entry was made from a production line. */
  name: string;
  buildingIds: number[];
  optionId: number;
}

export const newAutomationEntryId = () => crypto.randomUUID();

/**
 * Drops buildings the city does not have from every entry.
 *
 * Ids go stale on their own: a building can be sold, or the entry can have been written against a
 * different city entirely. A stale id is not harmless — the watcher would report it missing every
 * poll for as long as the entry lived. Entries left with nothing are kept rather than quietly
 * deleted; an empty row is something to look at and decide about, a vanished one is not.
 *
 * Returns the original array when there is nothing to drop, so a caller can tell whether anything
 * needs storing without comparing the contents.
 */
export const pruneAutomations = (entries: AutomationEntry[], cityBuildingIds: Set<number>) => {
  const dropped: number[] = [];

  const pruned = entries.map((entry) => {
    const kept = entry.buildingIds.filter((id) => cityBuildingIds.has(id));
    if (kept.length === entry.buildingIds.length) {
      return entry;
    }
    dropped.push(...entry.buildingIds.filter((id) => !cityBuildingIds.has(id)));
    return { ...entry, buildingIds: kept };
  });

  return dropped.length === 0 ? { entries, dropped } : { entries: pruned, dropped };
};
