import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { TournyAddUnits } from '../model/tourny/addUnits';
import { getAccountBySessionId } from './AccountManager';

/**
 * Applies an army delta to the cached squad sizes, so troop counts stay current without waiting
 * for a full city refresh. `size` is signed: it arrives negative after a battle (losses) and
 * positive when units are trained or bought.
 */
export const processTournyAddUnits = async (
  response: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<TournyAddUnits | undefined> => {
  const addUnitsResponse = response.find(
    (entry) => entry.requestClass === 'ArmyService' && entry.requestMethod === 'addUnit',
  ) as { responseData: TournyAddUnits } | undefined;

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  const armyDetails = accountData?.cityQuery?.armyDetails;

  const addUnits = addUnitsResponse?.responseData;

  if (armyDetails && addUnits) {
    const squads = armyDetails.unitSquads;
    const squad = squads.find((s) => s.unitTypeId === addUnits.unitTypeId);
    if (squad) {
      squad.size += addUnits.size;
    }

    // Replaced rather than mutated in place so subscribers see a new array.
    accountData.cityQuery!.armyDetails = {
      ...armyDetails,
      unitSquads: [...squads],
    };
  }

  return addUnits;
};
