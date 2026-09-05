import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { NeighbourHelpBuildingsResponse, NeighbourHelpData } from '../model/neighbourHelpBuildings';

export const processNeighbourHelpBuildings = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<NeighbourHelpData | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const neighbourHelpBuildingsResponse = response.find(
    (entry) => entry.requestClass === 'OtherPlayerService' && entry.requestMethod === 'getNeighbourlyHelpBuildings',
  ) as NeighbourHelpBuildingsResponse | undefined;

  const neighbourHelpData = neighbourHelpBuildingsResponse?.responseData;

  const rc = neighbourHelpData;

  return rc;
};
