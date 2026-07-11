import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { TournyAddUnits } from '../model/tourny/addUnits';
import { getAccountBySessionId } from './AccountManager';

export const processTournyAddUnits = async (
  response: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<TournyAddUnits | undefined> => {
  const addUnitsResponse = response.find(
    (entry) => entry.requestClass === 'ArmyService' && entry.requestMethod === 'addUnit',
  ) as { responseData: TournyAddUnits } | undefined;

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  const army_details = accountData?.cityQuery?.armyDetails;

  const addUnits = addUnitsResponse?.responseData;

  if (army_details && addUnits) {
    const squads = army_details.unitSquads;
    const unitTypeId = addUnits.unitTypeId;
    const squad = squads.find((s) => s.unitTypeId === unitTypeId);
    if (squad) {
      squad.size += addUnits.size;

      console.log(
        `Added ${addUnits.size} units of type ${unitTypeId} to existing squad. New squad size: ${squad.size}`,
      );
    }

    const newArmyDetails = {
      ...army_details,
      unitSquads: [...squads],
    };

    accountData.cityQuery!.armyDetails = newArmyDetails;
  }

  return addUnits;
};
