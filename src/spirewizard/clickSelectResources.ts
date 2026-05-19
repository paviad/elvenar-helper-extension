import { EncounterData } from '../model/spire';
import { sleep } from './spirewizard-inject';
import { backTranslations } from './backTranslations';

export const clickSelectResources = async (encounterData: EncounterData) => {
  const resources = Object.keys(encounterData.diplomacy.costOptions.resources);
  for (const resource of resources) {
    const backTranslation = backTranslations[resource];
    if (!backTranslation || ['money', 'supplies'].includes(backTranslation)) {
      continue;
    }

    /*
    <div class="select-resource">
      <img src="/images/scrolls.png" alt="scrolls" width="32px" />
    </div>
*/
    const resourceDiv = Array.from(document.querySelectorAll('div.select-resource')).find((div) => {
      const img = div.querySelector('img');
      return img?.alt === backTranslation;
    });
    if (resourceDiv) {
      (resourceDiv as HTMLDivElement).click();
    } else {
      console.warn(`ElvenAssist: Resource div for ${backTranslation} not found.`);
    }

    await sleep(300);
  }
};
