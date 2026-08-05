import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ProvinceInformationResponse, TournyProvinceInformation } from '../model/tourny/provinceInformation';

export const processTournyProvinceInformation = async (
  response: ElvenarRequestResponseEntry[],
  _: unknown,
  request: ElvenarRequestResponseEntry,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<TournyProvinceInformation | undefined> => {
  const provinceInformationResponse = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'getProvinceInformation',
  ) as ProvinceInformationResponse | undefined;

  if (!provinceInformationResponse) {
    return undefined;
  }

  // The response body carries no coordinates, so they are read back off the request, which is
  // the positional array [r, q]. This is the only reason this processor needs `request`.
  const hex = request.requestData as [number, number];

  const r = hex[0] || 0;
  const q = hex[1] || 0;

  return {
    ...provinceInformationResponse.responseData,
    r,
    q,
  };
};
