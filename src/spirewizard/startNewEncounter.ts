import { EncounterData } from '../model/spire';
import { backTranslations } from './backTranslations';
import { sendPicksBackToElvenar } from './sendPicksBackToElvenar';
import { SpireWizard } from './SpireWizard';
import { waitForChoiceToBe } from './waitForChoiceToBe';

export const startNewEncounter = async (encounterData: EncounterData) => {
  apiStartNewEncounter();
  apiSelectResources(encounterData);
  apiClickConfirmResourceSelection();
  const { picks, prob, jokerGhost } = await waitForChoiceToBe(1);
  sendPicksBackToElvenar(picks, prob, jokerGhost);
};

const apiStartNewEncounter = () => {
  SpireWizard.goHome();
};

const apiSelectResources = (encounterData: EncounterData) => {
  const resources = Object.keys(encounterData.diplomacy.costOptions.resources);
  const mappedResources = resources.map((resource) => backTranslations[resource]).filter((res) => res !== undefined);
  SpireWizard.selectResources(mappedResources);
};

const apiClickConfirmResourceSelection = () => {
  SpireWizard.startGame();
};
