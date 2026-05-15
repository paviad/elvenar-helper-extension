import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ProvinceInformationResponse, TournyProvinceInformation } from '../model/tourny/provinceInformation';

// eslint-disable-next-line @typescript-eslint/require-await
export const processTournyProvinceInformation = async (
  response: ElvenarRequestResponseEntry[],
  _: unknown,
  request: ElvenarRequestResponseEntry,
): Promise<TournyProvinceInformation | undefined> => {
  const provinceInformationResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'getProvinceInformation',
  ) as ProvinceInformationResponse | undefined;

  if (!provinceInformationResponse) {
    return undefined;
  }

  const hex = request.requestData as [number, number];

  const r = hex[0] || 0;
  const q = hex[1] || 0;

  const rc = {
    ...provinceInformationResponse.responseData,
    r,
    q,
  };

  return rc;
};
