import { SpireWizard } from './SpireWizard';
import { translationsMobile } from './translationsMobile';

export interface ChoiceResult {
  picks: string[];
  /** Win probability reported for the most advanced turn the wizard has computed. */
  prob?: string;
}

export const waitForChoiceToBe = async (targetChoice: number): Promise<ChoiceResult> => {
  let state = SpireWizard.getState();
  let choice = state.choice;
  console.log(`Waiting for choice to be ${targetChoice}. Current choice:`, choice);
  while (choice < targetChoice) {
    await new Promise((r) => setTimeout(r, 100));
    state = SpireWizard.getState();
    choice = state.choice;
  }
  console.log(`Choice is now ${targetChoice}`, state);
  const resources = state.selectedResources;
  return {
    picks: state.picks[targetChoice].map((z) => translationsMobile[resources[z]]),
    prob: latestProb(state.prob),
  };
};

// Every turn key exists up front; turns not reached yet hold null, and turn 1 is never populated.
// So take the highest turn that actually has a value, not simply the highest key.
const latestProb = (prob: Record<number, string | null> | undefined) => {
  const answeredTurns = Object.entries(prob ?? {})
    .filter(([, value]) => !!value)
    .map(([turn]) => Number(turn))
    .filter((turn) => !Number.isNaN(turn));
  if (answeredTurns.length === 0) {
    return undefined;
  }
  return prob?.[Math.max(...answeredTurns)] ?? undefined;
};
