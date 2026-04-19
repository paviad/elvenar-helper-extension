import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { DiplomacySubmitData } from '../model/spire';

export const processSpireDiplomacySubmit = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const json = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: unknown;
  }[];

  const submitResult = json.find((r) => r.requestClass === 'SpireDiplomacyService' && r.requestMethod === 'submit');

  const diplomacySubmitData = submitResult?.responseData as DiplomacySubmitData;

  const tabs = await chrome.tabs.query({});

  tabs.forEach((tab) => {
    if (!tab.id) {
      return;
    }
    chrome.tabs.sendMessage(tab.id, {
      type: 'spireDiplomacySubmit',
      payload: {
        diplomacySubmitData,
      },
    }).catch((e) => {
      /* ignore */
    });
  });
};
