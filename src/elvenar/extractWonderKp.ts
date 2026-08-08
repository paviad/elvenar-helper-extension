import { AncientWonderPhase, AncientWonderPhaseClass } from '../model/ancientWonderPhase';
import { WonderKp } from '../model/wonderKp';

/**
 * The knowledge point standing of your own wonders, thinned out of the game's phase list.
 *
 * Phases arrive for other players' wonders too — visiting a city, or contributing to one —
 * so they are filtered to the given player. Anything that is not a research phase, or that
 * arrives without both figures, is dropped: there is no knowledge to ask for in either case,
 * and a half-filled entry would read as a wonder that needs nothing.
 */
export function extractWonderKp(phases: AncientWonderPhase[] | undefined, playerId: number | undefined): WonderKp[] {
  if (!phases?.length || !playerId) {
    return [];
  }

  const kept = new Map<string, WonderKp>();
  for (const phase of phases) {
    if (phase.__class__ !== AncientWonderPhaseClass.ResearchPhaseVO || phase.playerId !== playerId) {
      continue;
    }
    if (phase.requiredKnowledgePoints === undefined) {
      continue;
    }
    kept.set(phase.entityBaseName, {
      baseName: phase.entityBaseName,
      invested: phase.investedKnowledgePoints ?? 0,
      required: phase.requiredKnowledgePoints,
    });
  }

  return [...kept.values()];
}
