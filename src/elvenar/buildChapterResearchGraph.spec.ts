import { ResearchStatus } from '../model/researchStatus';
import { ResearchTechnology } from '../model/researchTechnology';
import { buildChapterResearchGraph } from './buildChapterResearchGraph';

const tree: ResearchTechnology[] = [
  { id: 'root', section: 2 },
  { id: 'earlier', section: 1, maxSP: 10 },
  {
    id: 'done',
    name: 'Done',
    section: 2,
    maxSP: 20,
    costs: { mana: 500 },
    parentIds: ['earlier'],
    childrenIds: ['open'],
    rewards: [{ type: 'building', value: 'B_1', buildingId: 'B_1' }],
  },
  { id: 'open', section: 2, maxSP: 30, parentIds: ['done'], requiredProvinces: 10 },
  { id: 'shut', section: 2, maxSP: 40, parentIds: ['open'] },
  { id: 'later', section: 3, maxSP: 50 },
];

const status: ResearchStatus = {
  chapter: 2,
  researched: ['earlier', 'done'],
  available: [{ id: 'open', missingKp: 12 }],
  locked: ['shut'],
};

describe('buildChapterResearchGraph', () => {
  const graph = buildChapterResearchGraph(tree, status);

  it('holds the chapter and nothing else, root included', () => {
    expect(graph.map((tech) => tech.id)).toEqual(['done', 'open', 'shut']);
  });

  it('says where the city stands on each technology', () => {
    expect(graph.map((tech) => tech.state)).toEqual(['researched', 'available', 'locked']);
  });

  it('counts the knowledge left: none when done, what is left when open, all of it when shut', () => {
    expect(graph.map((tech) => tech.kp_missing)).toEqual([0, 12, 40]);
  });

  it('carries the costs and the edges, and nothing the planner has no use for', () => {
    expect(graph[0]).toEqual({
      id: 'done',
      name: 'Done',
      state: 'researched',
      kp_cost: 20,
      kp_missing: 0,
      costs: { mana: 500 },
      parents: ['earlier'],
      children: ['open'],
    });
  });
});
