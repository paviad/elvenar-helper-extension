import { AutomationEntry } from './automationEntry';
import { assignJobs, batchStarts, Job } from './productionWatcher';

const entry = (id: string, buildingIds: number[], optionId = 1, name = id.toUpperCase()): AutomationEntry => ({
  id,
  name,
  buildingIds,
  optionId,
});

describe('assignJobs', () => {
  it('gives every building of every entry a job', () => {
    const jobs = assignJobs([entry('a', [1, 2], 3), entry('b', [4], 7)]);

    expect([...jobs]).toEqual([
      [1, { entryId: 'a', name: 'A', optionId: 3 }],
      [2, { entryId: 'a', name: 'A', optionId: 3 }],
      [4, { entryId: 'b', name: 'B', optionId: 7 }],
    ]);
  });

  it('leaves a building two entries claim with the first of them', () => {
    // The tab keeps the entries apart as they are written, so this is the last line, not the rule.
    const jobs = assignJobs([entry('a', [1, 2], 3), entry('b', [2, 5], 7)]);

    expect(jobs.get(2)).toEqual({ entryId: 'a', name: 'A', optionId: 3 });
    expect(jobs.get(5)).toEqual({ entryId: 'b', name: 'B', optionId: 7 });
  });

  it('has nothing to hand out for an empty list', () => {
    expect(assignJobs([]).size).toBe(0);
  });
});

describe('batchStarts', () => {
  const job = (entryId: string, optionId: number): Job => ({ entryId, name: entryId.toUpperCase(), optionId });

  const started = (...pairs: [number, Job][]) => pairs.map(([id, j]) => ({ id, job: j }));

  it('puts one automation into one request', () => {
    const marble = job('a', 2);

    expect(batchStarts(started([1, marble], [2, marble], [3, marble]))).toEqual([
      { name: 'A', optionId: 2, ids: [1, 2, 3] },
    ]);
  });

  it('keeps two automations apart even when they picked the same option id', () => {
    // The point of the whole thing: sent as one request, `localStartProduction` spends down the
    // stock across both and stops at the first building it cannot pay for - so an unaffordable
    // workshop at the front would take the marble behind it down with it.
    const workshops = job('a', 1);
    const marble = job('b', 1);

    expect(batchStarts(started([1, workshops], [2, marble], [3, workshops]))).toEqual([
      { name: 'A', optionId: 1, ids: [1, 3] },
      { name: 'B', optionId: 1, ids: [2] },
    ]);
  });

  it('sends the automations in the order their first building came up', () => {
    // Which is the order the entries are listed in, and so the order they get the stock in.
    const first = job('a', 1);
    const second = job('b', 2);

    expect(batchStarts(started([9, second], [1, first])).map((batch) => batch.name)).toEqual(['B', 'A']);
  });

  it('has nothing to send when nothing was started', () => {
    expect(batchStarts([])).toEqual([]);
  });
});
