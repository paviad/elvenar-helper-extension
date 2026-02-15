import { startNewEncounter } from './startNewEncounter';
import { submitDiplomacy } from './submitDiplomacy';

console.log('ElvenAssist: Spire Wizard Inject Module Loaded');

let errorShown = false;

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }
  if (window.location.href !== 'https://javascriptorian.com/spire-wizard-mobile') {
    if (!errorShown) {
      console.error('ElvenAssist: Only spire-wizard-mobile page is supported.');
      errorShown = true;
    }
    return;
  }
  if (event.data?.type === 'spireEncounterStarted') {
    startNewEncounter(event.data.payload);
  }
  if (event.data?.type === 'spireDiplomacySubmit') {
    submitDiplomacy(event.data.payload);
    // Add your message handling logic here
  }
  // Add your message handling logic here
});

export const resultColors: Record<string, string> = {
  correct: 'green',
  nobody: 'red',
  other: 'yellow',
};

export const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
