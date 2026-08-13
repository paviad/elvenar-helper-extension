import { TechnologyProgressResponse } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';
import { classifyResearchStatus } from './processResearchStatus';

const tech = (id: string, section: number, maxSP: number, parentIds: string[]): ResearchTechnology => ({
  id,
  section,
  maxSP,
  parentIds,
});

const progress = (id: string, currentSP?: number, is_paid?: boolean): TechnologyProgressResponse => ({
  __class__: 'TechnologyVO',
  id,
  progress: { __class__: 'ResearchTechnologyProgressVO', tech_id: id, currentSP, is_paid },
});

// root ─ a ─┬─ b ─┬─ d (chapter 1)
//           └─ c ─┘
//                 └─ e (chapter 2)
const tree: ResearchTechnology[] = [
  { id: 'root', section: 1 },
  tech('a', 1, 10, ['root']),
  tech('b', 1, 20, ['a']),
  tech('c', 1, 30, ['a']),
  tech('d', 1, 40, ['b', 'c']),
  tech('e', 2, 50, ['d']),
];

describe('classifyResearchStatus', () => {
  it('splits the chapter into what is done, open and shut', () => {
    const status = classifyResearchStatus(
      tree,
      [progress('root'), progress('a', 10, true), progress('b', 20, true)],
      new Set(['a', 'b']),
      1,
    );

    expect(status).toEqual({
      chapter: 1,
      researched: ['a', 'b'],
      available: [{ id: 'c', missingKp: 30 }],
      locked: ['d'],
    });
  });

  it('counts the knowledge already put into a technology', () => {
    const status = classifyResearchStatus(tree, [progress('a', 10, true), progress('c', 12)], new Set(['a']), 1);

    expect(status.available).toEqual([
      { id: 'b', missingKp: 20 },
      { id: 'c', missingKp: 18 },
    ]);
  });

  it('holds a technology shut until every predecessor is researched', () => {
    const status = classifyResearchStatus(tree, [], new Set(['a', 'b']), 1);

    expect(status.available.map((t) => t.id)).toEqual(['c']);
    expect(status.locked).toEqual(['d']);
  });

  it('leaves out later chapters and the tree root', () => {
    const status = classifyResearchStatus(tree, [], new Set(['a', 'b', 'c', 'd']), 1);

    expect(status.researched).toEqual(['a', 'b', 'c', 'd']);
    expect(status.available).toEqual([]);
    expect(status.locked).toEqual([]);
  });

  it('falls back to the deepest researched chapter when the city has not said which it is in', () => {
    const status = classifyResearchStatus(tree, [], new Set(['a', 'b', 'c', 'd', 'e']), 0);

    expect(status.chapter).toBe(2);
    expect(status.researched).toContain('e');
  });
});
