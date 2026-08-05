import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { TournyTime } from '../model/tourny/tournamentTime';

// eslint-disable-next-line @typescript-eslint/require-await
export const processTournyUpdateTime = async (untypedJson: unknown): Promise<TournyTime | undefined> => {
  const response = untypedJson as ElvenarRequestResponseEntry[];

  const updateTimeEntry = response.find(
    (entry) => entry.requestClass === 'WorldMapService' && entry.requestMethod === 'updateTournamentTime',
  ) as { responseData: TournyTime } | undefined;

  return updateTimeEntry?.responseData;
};
