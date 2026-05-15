import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WorldNeighbor, WorldNeighborsResponse } from '../model/worldNeighbors';

export const processWorldNeighbors = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WorldNeighbor[]> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const worldNeighborsResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'getDiscoveredPlayerProvinces',
  ) as WorldNeighborsResponse | undefined;

  const worldNeighborsData = worldNeighborsResponse?.responseData.map((raw) => ({
    ...raw,
  }));

  const rc = worldNeighborsData || [];

  return rc;
};
