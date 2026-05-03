import { DiplomacySubmitData } from '../model/spire';
import { backTranslations } from './backTranslations';
import { sleep, resultColors } from './spirewizard-inject';

export const clickSubmitDiplomacy = async (diplomacySubmitData: DiplomacySubmitData) => {
  const turn = diplomacySubmitData.turn;
  const turnName = ['', '', 'one', 'two', 'three'][turn];
  const choiceDiv = document.querySelector(`div.choice.${turnName}`);
  if (diplomacySubmitData.slots.every((s) => s.history[s.history.length - 1].result === 'correct')) {
    return;
  }
  if (choiceDiv) {
    const results = diplomacySubmitData.slots
      .filter((s) => s.history.some((h) => h.turn === turn - 1))
      .map((s) => {
        const result = s.history.find((z) => z.turn === turn - 1);
        if (!result) {
          throw new Error(`No history found for slot in turn ${turn - 1}`);
        }
        return {
          slot: s.slot || 0,
          goodId: result.goodId,
          result: result.result,
        };
      });

    for (const res of results) {
      const backTranslation = backTranslations[res.goodId];
      if (!backTranslation) {
        throw new Error(`No back translation found for goodId ${res.goodId}`);
      }
      const resourceDiv = Array.from(choiceDiv.querySelectorAll('div.select-resource'))[res.slot];
      if (resourceDiv) {
        (resourceDiv as HTMLDivElement).click();
        await sleep(300);
        const dropdownMenu = resourceDiv.nextElementSibling as HTMLElement | null;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
          // Ensure the dropdown menu is visible by adding the 'show' class if not present
          if (!dropdownMenu.classList.contains('show')) {
            throw new Error('Dropdown menu does not have the "show" class after clicking resourceDiv.');
          }
          const colorClass = resultColors[res.result]; // should be 'green', 'yellow', or 'red'
          const colorLink = dropdownMenu.querySelector(`a.${colorClass}`);
          if (colorLink) {
            (colorLink as HTMLAnchorElement).click();
            await sleep(300);
          } else {
            throw new Error(`No <a> tag with class ${colorClass} found in dropdown menu.`);
          }
        } else {
          throw new Error('Dropdown menu not found or does not have correct class.');
        }
      } else {
        throw new Error(`Resource div for ${backTranslation} not found in choice div.`);
      }
    }
    // Find the submit button with class "submit-choice" under the choice div and click it
    const submitButton = choiceDiv.querySelector('button.submit-choice');
    if (submitButton) {
      (submitButton as HTMLButtonElement).click();
    } else {
      throw new Error('No submit-choice button found in choice div.');
    }
  } else {
    throw new Error(`No choice div found for turn ${turn}.`);
  }
};
