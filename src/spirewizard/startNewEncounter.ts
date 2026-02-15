import { EncounterData } from '../model/spire';
import { backTranslations } from './backTranslations';
import { SpireWizard } from './SpireWizard';

export const startNewEncounter = async (encounterData: EncounterData) => {
  apiStartNewEncounter();
  apiSelectResources(encounterData);
  apiClickConfirmResourceSelection();
};

const apiStartNewEncounter = async () => {
  SpireWizard.goHome();
};

const apiSelectResources = async (encounterData: EncounterData) => {
  const resources = Object.keys(encounterData.diplomacy.costOptions.resources);
  const mappedResources = resources
    .map((resource) => backTranslations[resource])
    .filter((res) => res !== undefined) as string[];
  SpireWizard.selectResources(mappedResources);
};

const apiClickConfirmResourceSelection = async () => {
  SpireWizard.startGame();
};
