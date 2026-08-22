import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';

/**
 * Folds the entities the game just reported into the stored city, stamping each with the moment
 * it arrived.
 *
 * The stamp is what makes the state usable as time: `next_state_transition_in` counts from when
 * the state was reported, and these reports land long after the startup data whose
 * `cityQuery.timestamp` would otherwise be taken for their starting point - a production started
 * just now would read as though it had been running since the city loaded.
 */
export const mergeReportedCityEntities = (stored: CityEntity[], reported: CityEntity[], at: number) => {
  for (const entity of reported) {
    const stamped = { ...entity, stateAt: at };
    const existingIndex = stored.findIndex((candidate) => candidate.id === entity.id);
    if (existingIndex === -1) {
      stored.push(stamped);
    } else {
      stored[existingIndex] = stamped;
    }
  }
  return stored;
};

/**
 * `CityMapService/reset` carries whichever entities have just changed - it is what the game sends
 * when a production is started, collected or cancelled, not only on a city load.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const processCityMapServiceUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const json = untypedJson as [{ requestClass: string; requestMethod: string; responseData: unknown }];

  const cityMapServiceReset = json.find((r) => r.requestClass === 'CityMapService' && r.requestMethod === 'reset')
    ?.responseData as CityEntity[] | undefined;

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData?.cityQuery?.cityEntities && cityMapServiceReset) {
    mergeReportedCityEntities(accountData.cityQuery.cityEntities, cityMapServiceReset, Date.now());
  }
};
