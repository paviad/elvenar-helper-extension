import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { NeighbourHelpBuildingsResponse, NeighbourHelpData } from '../model/neighbourHelpBuildings';

// eslint-disable-next-line @typescript-eslint/require-await
export const processNeighbourHelpBuildings = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
): Promise<NeighbourHelpData | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const neighbourHelpBuildingsResponse = response.find(
    (entry) => entry.requestClass === 'OtherPlayerService' && entry.requestMethod === 'getNeighbourlyHelpBuildings',
  ) as NeighbourHelpBuildingsResponse | undefined;

  const neighbourHelpData = neighbourHelpBuildingsResponse?.responseData;

  console.log('Processed neighbour help buildings data:', neighbourHelpData);

  const rc = neighbourHelpData;

  return rc;
};
