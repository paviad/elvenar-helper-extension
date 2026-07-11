import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InitialWorldMapData, InitialWorldMapDataResponse } from '../model/initialWorldMapData';

export const processInitialWorldMapData = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
// eslint-disable-next-line @typescript-eslint/require-await
): Promise<InitialWorldMapData | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const initialWorldMapDataResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'fetchInitialWorldMapData',
  ) as InitialWorldMapDataResponse | undefined;

  const initialWorldMapData = initialWorldMapDataResponse?.responseData;

  return initialWorldMapData;
};
