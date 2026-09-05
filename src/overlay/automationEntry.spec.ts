import { AutomationEntry, claimBuildings, dedupeAutomations, pruneAutomations } from './automationEntry';

const entry = (id: string, buildingIds: number[], name = 'Beverages', optionId = 1): AutomationEntry => ({
  id,
  name,
  buildingIds,
  optionId,
});

describe('pruneAutomations', () => {
  it('drops the buildings the city does not have', () => {
    const entries = [entry('a', [1, 2, 3])];

    const { entries: pruned, dropped } = pruneAutomations(entries, new Set([1, 3]));

    expect(pruned[0].buildingIds).toEqual([1, 3]);
    expect(dropped).toEqual([2]);
  });

  it('hands back the very same array when there is nothing to drop', () => {
    const entries = [entry('a', [1, 2])];

    const { entries: pruned, dropped } = pruneAutomations(entries, new Set([1, 2, 99]));

    // Same reference, so the caller can tell there is nothing to store without comparing.
    expect(pruned).toBe(entries);
    expect(dropped).toEqual([]);
  });

  it('leaves the entries it did not have to touch alone', () => {
    const untouched = entry('a', [1]);
    const entries = [untouched, entry('b', [2, 3])];

    const { entries: pruned } = pruneAutomations(entries, new Set([1, 2]));

    expect(pruned[0]).toBe(untouched);
    expect(pruned[1].buildingIds).toEqual([2]);
  });

  it('keeps an entry that has lost every building rather than deleting it', () => {
    // An empty row is something to look at and decide about; a vanished one is not.
    const { entries: pruned, dropped } = pruneAutomations([entry('a', [1, 2])], new Set());

    expect(pruned).toHaveLength(1);
    expect(pruned[0].buildingIds).toEqual([]);
    expect(dropped).toEqual([1, 2]);
  });

  it('reports what went from across every entry', () => {
    const entries = [entry('a', [1, 2]), entry('b', [3, 4])];

    expect(pruneAutomations(entries, new Set([1, 3])).dropped).toEqual([2, 4]);
  });

  it('has nothing to say about an empty list', () => {
    const entries: AutomationEntry[] = [];

    expect(pruneAutomations(entries, new Set([1]))).toEqual({ entries, dropped: [] });
  });
});

describe('claimBuildings', () => {
  it('puts a new entry on the end', () => {
    const entries = [entry('a', [1])];

    const { entries: saved } = claimBuildings(entries, entry('b', [2]));

    expect(saved.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('replaces an entry it has the id of, in its place', () => {
    const entries = [entry('a', [1]), entry('b', [2]), entry('c', [3])];

    const { entries: saved } = claimBuildings(entries, entry('b', [20, 21], 'Toolbox', 2));

    expect(saved.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(saved[1]).toEqual({ id: 'b', name: 'Toolbox', buildingIds: [20, 21], optionId: 2 });
  });

  it('takes the buildings it claims off every other entry', () => {
    const entries = [entry('a', [1, 2, 3]), entry('b', [4, 5])];

    const { entries: saved } = claimBuildings(entries, entry('c', [2, 4]));

    expect(saved[0].buildingIds).toEqual([1, 3]);
    expect(saved[1].buildingIds).toEqual([5]);
    expect(saved[2].buildingIds).toEqual([2, 4]);
  });

  it('says what it took and whose it was', () => {
    const entries = [entry('a', [1, 2, 3], 'Marble'), entry('b', [4, 5], 'Planks')];

    const { takenFrom } = claimBuildings(entries, entry('c', [2, 3, 4]));

    expect(takenFrom).toEqual([
      { name: 'Marble', ids: [2, 3] },
      { name: 'Planks', ids: [4] },
    ]);
  });

  it('has nothing to say when no other entry wanted them', () => {
    const entries = [entry('a', [1])];

    expect(claimBuildings(entries, entry('b', [2])).takenFrom).toEqual([]);
  });

  it('leaves the entries it did not have to touch alone', () => {
    const untouched = entry('a', [1]);
    const entries = [untouched, entry('b', [2, 3])];

    const { entries: saved } = claimBuildings(entries, entry('c', [3]));

    expect(saved[0]).toBe(untouched);
    expect(saved[1].buildingIds).toEqual([2]);
  });

  it('keeps an entry it has taken everything from rather than deleting it', () => {
    // The same call as `pruneAutomations` makes: an empty row is something to look at.
    const { entries: saved } = claimBuildings([entry('a', [1, 2])], entry('b', [1, 2]));

    expect(saved).toHaveLength(2);
    expect(saved[0].buildingIds).toEqual([]);
  });

  it('does not count an entry as taking from itself', () => {
    // Editing one down to fewer buildings is not one entry robbing another.
    const entries = [entry('a', [1, 2, 3])];

    const { entries: saved, takenFrom } = claimBuildings(entries, entry('a', [1, 2]));

    expect(saved).toHaveLength(1);
    expect(saved[0].buildingIds).toEqual([1, 2]);
    expect(takenFrom).toEqual([]);
  });
});

describe('dedupeAutomations', () => {
  it('leaves a building in the first entry that claimed it', () => {
    const entries = [entry('a', [1, 2]), entry('b', [2, 3]), entry('c', [1, 3, 4])];

    const { entries: deduped } = dedupeAutomations(entries);

    expect(deduped.map((e) => e.buildingIds)).toEqual([[1, 2], [3], [4]]);
  });

  it('reports every building it took', () => {
    const entries = [entry('a', [1, 2]), entry('b', [2, 3]), entry('c', [1, 3])];

    expect(dedupeAutomations(entries).duplicates).toEqual([2, 1, 3]);
  });

  it('hands back the very same array when no two entries overlap', () => {
    const entries = [entry('a', [1, 2]), entry('b', [3])];

    const { entries: deduped, duplicates } = dedupeAutomations(entries);

    // Same reference, so the caller can tell there is nothing to store without comparing.
    expect(deduped).toBe(entries);
    expect(duplicates).toEqual([]);
  });

  it('leaves the entries it did not have to touch alone', () => {
    const untouched = entry('a', [1]);
    const entries = [untouched, entry('b', [1, 2])];

    const { entries: deduped } = dedupeAutomations(entries);

    expect(deduped[0]).toBe(untouched);
    expect(deduped[1].buildingIds).toEqual([2]);
  });

  it('drops a building an entry names twice over', () => {
    const { entries: deduped, duplicates } = dedupeAutomations([entry('a', [1, 1, 2])]);

    expect(deduped[0].buildingIds).toEqual([1, 2]);
    expect(duplicates).toEqual([1]);
  });

  it('has nothing to say about an empty list', () => {
    const entries: AutomationEntry[] = [];

    expect(dedupeAutomations(entries)).toEqual({ entries, duplicates: [] });
  });
});
