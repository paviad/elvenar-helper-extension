import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GetProvincesOverviewResponse, TournyProvince } from '../model/tourny/provincesOverview';

export const processTournyProvincesOverview = async (
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<TournyProvince[] | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const provincesOverview = response.find(
    (entry) => entry.requestClass === 'TournamentService' && entry.requestMethod === 'getProvincesOverview',
  ) as GetProvincesOverviewResponse | undefined;

  // `upgradeTime` counts down from when the response was built, so it is turned into an absolute
  // deadline here — a relative value would appear to freeze between refreshes.
  const provinces = provincesOverview?.responseData?.provinces?.map((p) => ({
    ...p,
    q: p.q || 0,
    r: p.r || 0,
    upgradeTimeEnd: p.upgradeTime ? Date.now() + p.upgradeTime * 1000 : undefined,
  }));

  return provinces;
};
