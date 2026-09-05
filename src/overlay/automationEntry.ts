/**
 * One job the Production tab keeps going: a set of buildings, and the option to start on them
 * whenever they come free. The entries are kept in the overlay store, so they outlive a refresh -
 * whether monitoring is running deliberately is not, and a refresh always comes back stopped.
 *
 * A building belongs to at most one entry across the whole list. It can only be producing one
 * thing at a time, so two entries naming it are not two jobs but one job and one lie: only one of
 * them could ever run, and nothing in the tab would say which. `claimBuildings` keeps that true as
 * entries are written, and `dedupeAutomations` makes it true for entries stored before it was.
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

/** One entry's buildings taken off another, and whose they were. */
export interface BuildingsTaken {
  name: string;
  ids: number[];
}

/**
 * Writes one entry into the list and takes its buildings off every other, so a building is only
 * ever in one.
 *
 * The entry being written wins, because it is the thing just asked for: picking a production line
 * hands over every building on it, and half of those are usually already in an older entry - the
 * common edit is `there are eight of these now, not the three I added last week`. Refusing the save
 * would leave that to be done by hand in the older entry first. Losing them to the newer one is
 * undone by re-saving the older one, which is the same gesture again.
 *
 * An entry left with no buildings is kept, the way `pruneAutomations` keeps one: an empty row is
 * something to look at and decide about, a vanished one is not.
 *
 * Upserts by id - the entry replaces the one with its id where there is one, and goes on the end
 * where there is not, so an edit keeps its place in the list and a new entry starts at the back.
 */
export const claimBuildings = (entries: AutomationEntry[], entry: AutomationEntry) => {
  const claimed = new Set(entry.buildingIds);
  const takenFrom: BuildingsTaken[] = [];

  const kept = entries.map((existing) => {
    if (existing.id === entry.id) {
      return entry;
    }
    const taken = existing.buildingIds.filter((id) => claimed.has(id));
    if (taken.length === 0) {
      return existing;
    }
    takenFrom.push({ name: existing.name, ids: taken });
    return { ...existing, buildingIds: existing.buildingIds.filter((id) => !claimed.has(id)) };
  });

  const isEdit = entries.some((existing) => existing.id === entry.id);
  return { entries: isEdit ? kept : [...kept, entry], takenFrom };
};

/**
 * Leaves a building in the first entry that names it and takes it out of the rest.
 *
 * For entries stored before the tab kept them apart, and as a net under anything that writes them
 * without going through `claimBuildings`. First wins rather than last, because that is what the
 * watcher already did with a building two entries claimed - so an existing list keeps behaving the
 * way it has been, instead of quietly changing which option it runs on the day this ships.
 *
 * Returns the original array when there was nothing to take, so a caller can tell whether anything
 * needs storing without comparing the contents.
 */
export const dedupeAutomations = (entries: AutomationEntry[]) => {
  const claimed = new Set<number>();
  const duplicates: number[] = [];

  const deduped = entries.map((entry) => {
    const kept = entry.buildingIds.filter((id) => {
      if (claimed.has(id)) {
        duplicates.push(id);
        return false;
      }
      claimed.add(id);
      return true;
    });
    return kept.length === entry.buildingIds.length ? entry : { ...entry, buildingIds: kept };
  });

  return duplicates.length === 0 ? { entries, duplicates } : { entries: deduped, duplicates };
};
