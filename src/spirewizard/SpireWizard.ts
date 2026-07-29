interface SpireWizardState {
  choice: number;
  // Keyed by turn (1..5), not a real array. Unreached turns hold an empty array.
  // Values are indices into selectedResources.
  picks: Record<number, number[]>;
  // Win probability per turn. All turn keys (2..5) exist from the start; turns not yet
  // reached hold null, and turn 1 is never populated.
  prob: Record<number, string | null>;
  selectedResources: string[];
  // Raw internal joker deduction (possibility sets hold resource indexes). Prefer
  // getJokerSuggestion(), which resolves those indexes to names.
  jokerData?: unknown;
}

interface JokerGhost {
  ghostIndex: number;
  /** 1-based, matches the wizard's "Ghost N" label. */
  ghostNumber: number;
  /** Already green and out of play; resources is empty. */
  satisfied: boolean;
  /** Exactly one candidate left, but still unsolved. */
  determined: boolean;
  count: number;
  /** Indexes into selectedResources. */
  resourceIndexes: number[];
  /** Wizard-side resource names, i.e. keys of translationsMobile. */
  resources: string[];
}

interface JokerSuggestion {
  /** A joker is worth spending. */
  recommended: boolean;
  ghostIndex: number;
  ghostNumber: number;
  /** recommended AND 6+ resources — the wizard's own banner render gate. */
  displayed: boolean;
  /** The round this suggestion applies to. */
  choice: number;
  assignmentCount: number;
  /** assignmentCount === 1: board fully solved, equivalent to a 100% win chance. */
  certain: boolean;
  /** No assignment fits — the colours as entered are impossible. */
  contradiction: boolean;
  /** Always 5 entries. */
  ghosts: JokerGhost[];
}

interface SpireWizard {
  getState: () => SpireWizardState;
  toggleResource: (name: string) => void;
  selectResources: (names: string[]) => void;
  getSelectedResources: () => string[];
  startGame: () => void;
  goHome: () => void;
  setResult: (choice: number, index: number, color: 'G' | 'Y' | 'R') => void;
  submitChoice: (choiceNum: number) => Promise<void>;
  /** Returns null when no game is in progress. Added mid-2026; guard before calling. */
  getJokerSuggestion?: () => JokerSuggestion | null;
}

declare global {
  interface Window {
    SpireWizard: SpireWizard;
  }
}

export const SpireWizard = window.SpireWizard;
