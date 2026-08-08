import { AncientWonderPhase, AncientWonderPhaseClass } from '../model/ancientWonderPhase';
import { extractWonderKp } from './extractWonderKp';

const research = (overrides: Partial<AncientWonderPhase> = {}): AncientWonderPhase => ({
  __class__: AncientWonderPhaseClass.ResearchPhaseVO,
  playerId: 7,
  entityBaseName: 'A_Wonder',
  resourceId: 'knowledge_points',
  investedKnowledgePoints: 30,
  requiredKnowledgePoints: 175,
  ...overrides,
});

describe('extractWonderKp', () => {
  it('keeps the two figures and drops everything else', () => {
    expect(extractWonderKp([research()], 7)).toEqual([{ baseName: 'A_Wonder', invested: 30, required: 175 }]);
  });

  it('drops phases belonging to other players', () => {
    expect(extractWonderKp([research({ playerId: 8 })], 7)).toEqual([]);
  });

  it('drops runes phases, which take no knowledge', () => {
    const runes = research({ __class__: AncientWonderPhaseClass.RunesPhaseVO, entityBaseName: 'A_Runed' });

    expect(extractWonderKp([research(), runes], 7)).toEqual([{ baseName: 'A_Wonder', invested: 30, required: 175 }]);
  });

  it('drops a phase with no requirement rather than reading it as needing nothing', () => {
    expect(extractWonderKp([research({ requiredKnowledgePoints: undefined })], 7)).toEqual([]);
  });

  it('treats a missing investment as none invested', () => {
    expect(extractWonderKp([research({ investedKnowledgePoints: undefined })], 7)).toEqual([
      { baseName: 'A_Wonder', invested: 0, required: 175 },
    ]);
  });

  it('returns nothing without a player to filter by', () => {
    expect(extractWonderKp([research()], undefined)).toEqual([]);
    expect(extractWonderKp(undefined, 7)).toEqual([]);
  });
});
