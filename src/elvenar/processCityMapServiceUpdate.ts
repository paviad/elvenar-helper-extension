import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export const processCityMapServiceUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const json = untypedJson as [{ requestClass: string; requestMethod: string; responseData: unknown }];

  const cityMapServiceReset = json.find(
    (r) => r.requestClass === 'CityMapService' && r.requestMethod === 'reset',
  )?.responseData as CityEntity[] | undefined;

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData?.cityQuery?.cityEntities && cityMapServiceReset) {
    for (const entity of cityMapServiceReset) {
      const existingEntityIndex = accountData.cityQuery.cityEntities.findIndex((e) => e.id === entity.id);
      if (existingEntityIndex !== undefined && existingEntityIndex !== -1) {
        accountData.cityQuery.cityEntities[existingEntityIndex] = entity;
      } else {
        accountData.cityQuery.cityEntities.push(entity);
      }
    }
  }
};
