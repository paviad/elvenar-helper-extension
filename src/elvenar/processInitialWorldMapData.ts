import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InitialWorldMapData, InitialWorldMapDataResponse } from '../model/initialWorldMapData';

// eslint-disable-next-line @typescript-eslint/require-await
export const processInitialWorldMapData = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
): Promise<InitialWorldMapData | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const initialWorldMapDataResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'fetchInitialWorldMapData',
  ) as InitialWorldMapDataResponse | undefined;

  const initialWorldMapData = initialWorldMapDataResponse?.responseData;

  console.log('Processed initial world map data:', initialWorldMapData);

  return initialWorldMapData;
};
