import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { EncounterData } from '../model/spire';

export async function processSpireEncounterStart(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: unknown;
  }[];

  const getEncounter = json.find((r) => r.requestClass === 'SpireService' && r.requestMethod === 'getEncounter');

  const encounterData = getEncounter?.responseData as EncounterData;

  const tabs = await chrome.tabs.query({});

  tabs.forEach((tab) => {
    if (!tab.id) {
      return;
    }
    chrome.tabs
      .sendMessage(tab.id, {
        type: 'spireEncounterStarted',
        payload: {
          encounterData,
        },
      })
      .catch((e) => {
        /* ignore */
      });
  });
}
