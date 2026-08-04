import { sendSpireStatusToElvenar } from './sendSpireStatusToElvenar';
import { SpireWizard } from './SpireWizard';
import { translationsMobile } from './translationsMobile';

// Generous on purpose: when this tab is occluded Chrome clamps our poll interval, so the
// wizard legitimately takes far longer than usual to advance.
const CHOICE_TIMEOUT_MS = 30000;

export interface ChoiceResult {
  /** The round these picks apply to — the wizard's choice, which tracks the game's turn. */
  turn: number;
  picks: string[];
  /** Win probability reported for the most advanced turn the wizard has computed. */
  prob?: string;
  /** 1-based ghost to spend a joker on; absent when a joker is not an option. */
  jokerGhost?: number;
}

export const waitForChoiceToBe = async (targetChoice: number): Promise<ChoiceResult> => {
  let state = SpireWizard.getState();
  let choice = state.choice;
  console.log(`Waiting for choice to be ${targetChoice}. Current choice:`, choice);

  if (choice < targetChoice) {
    sendSpireStatusToElvenar('waiting', targetChoice);
  }

  // Wall-clock deadline rather than an iteration count: a throttled tab runs this loop far
  // fewer times than it would at 100ms, and an unbounded wait is what used to look like a hang.
  const deadline = Date.now() + CHOICE_TIMEOUT_MS;
  while (choice < targetChoice) {
    if (Date.now() > deadline) {
      console.error(`ElvenAssist: Spire Wizard never reached choice ${targetChoice}; giving up`, state);
      sendSpireStatusToElvenar('timeout', targetChoice);
      return { turn: targetChoice, picks: [] };
    }
    await new Promise((r) => setTimeout(r, 100));
    state = SpireWizard.getState();
    choice = state.choice;
  }
  console.log(`Choice is now ${targetChoice}`, state);
  const resources = state.selectedResources;
  return {
    turn: targetChoice,
    picks: state.picks[targetChoice].map((z) => translationsMobile[resources[z]]),
    prob: latestProb(state.prob),
    jokerGhost: jokerGhostFor(targetChoice),
  };
};

// Gated on `displayed` rather than `recommended` so we agree with the wizard's own banner,
// which stays hidden in 3-5 resource games even when a joker is recommended.
const jokerGhostFor = (targetChoice: number) => {
  if (typeof SpireWizard.getJokerSuggestion !== 'function') {
    return undefined; // wizard site predates the joker API
  }
  const suggestion = SpireWizard.getJokerSuggestion();
  if (!suggestion) {
    return undefined;
  }
  if (suggestion.contradiction) {
    // The colours we fed in cannot happen — almost certainly our own mapping is off.
    console.warn('ElvenAssist: Spire Wizard reports a contradiction in the entered results', suggestion);
  }
  if (suggestion.choice !== targetChoice) {
    console.warn(
      `ElvenAssist: joker suggestion is for choice ${suggestion.choice}, expected ${targetChoice}`,
      suggestion,
    );
  }
  return suggestion.displayed ? suggestion.ghostNumber : undefined;
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
