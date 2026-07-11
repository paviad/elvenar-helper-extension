import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WorldNeighbor } from '../model/worldNeighbors';

export const processHelpPerformedUpdateProvince = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<WorldNeighbor | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const updatedProvinceResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'updateProvince',
  ) as
    | {
        responseData: WorldNeighbor;
      }
    | undefined;

  const updatedProvince = updatedProvinceResponse?.responseData;

  const rc = updatedProvince;

  return rc;
};
