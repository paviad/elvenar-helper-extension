import { AutomationEntry, pruneAutomations } from './automationEntry';

const entry = (id: string, buildingIds: number[]): AutomationEntry => ({
  id,
  name: 'Beverages',
  buildingIds,
  optionId: 1,
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
