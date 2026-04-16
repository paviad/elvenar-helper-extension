import { sleep } from './spirewizard-inject';

export const clickStartNewEncounter = async () => {
  const navContainer = document.querySelector('div.spire-nav.container');
  if (navContainer) {
    const buttons = navContainer.querySelectorAll('button');
    if (buttons.length === 2) {
      (buttons[0] as HTMLButtonElement).click();
    } else if (buttons.length === 1) {
      const selectedResources = Array.from(document.querySelectorAll('div.resource-list div.select-resource.selected'));
      for (const res of selectedResources) {
        (res as HTMLDivElement).click();
        await sleep(300);
      }
    } else {
      console.warn('ElvenAssist: No buttons found in spire-nav container.');
    }
  } else {
    console.warn('ElvenAssist: No spire-nav container found.');
  }
};
