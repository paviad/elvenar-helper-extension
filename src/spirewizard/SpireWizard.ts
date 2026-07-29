interface SpireWizardState {
  choice: number;
  // Keyed by turn (1..5), not a real array. Unreached turns hold an empty array.
  // Values are indices into selectedResources.
  picks: Record<number, number[]>;
  // Win probability per turn. All turn keys (2..5) exist from the start; turns not yet
  // reached hold null, and turn 1 is never populated.
  prob: Record<number, string | null>;
  selectedResources: string[];
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
}

declare global {
  interface Window {
    SpireWizard: SpireWizard;
  }
}

export const SpireWizard = window.SpireWizard;
