import { SpireWizard } from './SpireWizard';
import { translationsMobile } from './translationsMobile';

export const waitForChoiceToBe = async (targetChoice: number) => {
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
  return state.picks[targetChoice].map((z) => translationsMobile[resources[z]]);
};
