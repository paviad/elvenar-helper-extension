import { AncientWonderPhase, AncientWonderPhaseClass } from '../model/ancientWonderPhase';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { collectAncientWonderPhases } from './processAncientWonderPhaseUpdate';

const phase = (entityBaseName: string, invested: number): AncientWonderPhase => ({
  __class__: AncientWonderPhaseClass.ResearchPhaseVO,
  playerId: 848933052,
  entityBaseName,
  resourceId: `${entityBaseName.toLowerCase()}_shards`,
  investedKnowledgePoints: invested,
  requiredKnowledgePoints: 2200,
});

const entry = (requestMethod: string, responseData: unknown): ElvenarRequestResponseEntry => ({
  __class__: 'ServerResponseVO',
  requestData: undefined,
  responseData,
  requestClass: 'AncientWonderService',
  requestMethod,
  requestId: 334,
});

describe('collectAncientWonderPhases', () => {
  it('reads the phases a contribution pushes', () => {
    const json = [entry('phaseUpdated', [phase('B_Fairies_AW2', 955)])];

    expect(collectAncientWonderPhases(json)).toEqual([phase('B_Fairies_AW2', 955)]);
  });

  it('reads the phases the wonder window asks for', () => {
    const json = [entry('getOtherPlayerAncientWonders', { ancientWonderPhases: [phase('B_All_AW2', 2085)] })];

    expect(collectAncientWonderPhases(json)).toEqual([phase('B_All_AW2', 2085)]);
  });

  it('takes both at once', () => {
    const json = [
      entry('phaseUpdated', [phase('B_Fairies_AW2', 955)]),
      entry('getOtherPlayerAncientWonders', { ancientWonderPhases: [phase('B_All_AW2', 2085)] }),
    ];

    expect(collectAncientWonderPhases(json).map((p) => p.entityBaseName)).toEqual(['B_Fairies_AW2', 'B_All_AW2']);
  });

  it('leaves anything else alone', () => {
    const json = [entry('getOtherPlayerAncientWonders', {}), entry('contribute', [phase('B_All_AW2', 2085)])];

    expect(collectAncientWonderPhases(json)).toEqual([]);
  });
});
