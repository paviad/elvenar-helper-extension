interface SpireWizard {
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
