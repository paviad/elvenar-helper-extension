import { TournyProvinceInformation } from '../model/tourny/provinceInformation';
import { TournyProvince } from '../model/tourny/provincesOverview';

export interface TournyData {
  provincesOverview: TournyProvince[];
  /** Keyed `${r},${q}`. Only holds provinces the player has opened on the tournament map. */
  provinceInformation: Record<string, TournyProvinceInformation>;
}

/**
 * The three responses arrive in any order, so whichever lands first has to start from this
 * rather than assume the overview came in already.
 */
export const emptyTournyData = (): TournyData => ({ provincesOverview: [], provinceInformation: {} });
