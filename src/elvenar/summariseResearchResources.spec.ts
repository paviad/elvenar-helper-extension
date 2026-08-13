import { ResearchStatus } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';
import { summariseResearchResources } from './summariseResearchResources';

const tree: ResearchTechnology[] = [
  { id: 'root', section: 1 },
  { id: 'old', section: 1, maxSP: 10, costs: { mana: 100 } },
  { id: 'done', section: 2, maxSP: 20, costs: { mana: 500, wisdom: 3 } },
  { id: 'open', section: 2, maxSP: 30, costs: { mana: 700, wisdom: 9 } },
  { id: 'shut', section: 2, maxSP: 40, costs: { wisdom: 20 } },
  { id: 'later', section: 3, maxSP: 40, costs: { wisdom: 1000 } },
];

const status: ResearchStatus = {
  chapter: 2,
  researched: ['old', 'done'],
  available: [{ id: 'open', missingKp: 30 }],
  locked: ['shut'],
};

describe('summariseResearchResources', () => {
  const summary = summariseResearchResources(tree, status, { mana: 'Mana' });

  it('splits each good into what the chapter has spent and what it still owes', () => {
    expect(summary.carriedOver).toEqual([
      { good: 'Mana', id: 'mana', used: 500, unlocked: 700, needed: 700, total: 1200 },
    ]);
  });

  it('counts the goods a shut technology asks for as needed but not as unlocked', () => {
    expect(summary.chapterGoods).toEqual([
      { good: 'wisdom', id: 'wisdom', used: 3, unlocked: 9, needed: 29, total: 32 },
    ]);
  });

  it('leaves out every other chapter and counts the technologies of this one', () => {
    expect(summary.chapter).toBe(2);
    expect(summary.technologies).toEqual({ researched: 1, unlocked: 1, remaining: 2 });
  });
});
