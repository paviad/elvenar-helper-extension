import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';

export const processCityResourcesUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const responseJson = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: unknown;
  }[];

  const json = responseJson.find(
    (entry) => entry.requestClass === 'CityResourcesService' && entry.requestMethod === 'getResources',
  );

  const cityResources = json?.responseData as {
    resources: Record<string, number>;
  } | undefined;

  const { __class__, ...resources } = cityResources?.resources || {};

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData?.cityQuery) {
    accountData.cityQuery.cityResources = resources;
  }
};
