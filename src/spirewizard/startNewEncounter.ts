import { EncounterData } from '../model/spire';
import { backTranslations } from './backTranslations';
import { SpireWizard } from './SpireWizard';

export const startNewEncounter = (encounterData: EncounterData) => {
  apiStartNewEncounter();
  apiSelectResources(encounterData);
  apiClickConfirmResourceSelection();
};

const apiStartNewEncounter = () => {
  SpireWizard.goHome();
};

const apiSelectResources = (encounterData: EncounterData) => {
  const resources = Object.keys(encounterData.diplomacy.costOptions.resources);
  const mappedResources = resources
    .map((resource) => backTranslations[resource])
    .filter((res) => res !== undefined);
  SpireWizard.selectResources(mappedResources);
};

const apiClickConfirmResourceSelection = () => {
  SpireWizard.startGame();
};
