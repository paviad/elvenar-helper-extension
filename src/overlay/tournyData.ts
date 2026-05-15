import { TournyProvinceInformation } from '../model/tourny/provinceInformation';
import { TournyProvince } from '../model/tourny/provincesOverview';

export interface TournyData {
  provincesOverview: TournyProvince[];
  provinceInformation: Record<string, TournyProvinceInformation>;
}
