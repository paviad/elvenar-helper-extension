export interface GetProvincesOverviewResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: ResponseData;
}

export interface ResponseData {
  maxEncounters: number;
  provinces: TournyProvince[];
}

export interface TournyProvince {
  encounters?: number;
  level?: number;
  number: number;
  q: number;
  r: number;
  rewards?: ProvinceOverviewReward[];
  baseTournamentPointsAmount?: number;
  upgradeTime?: number;
  upgradeTimeEnd?: number;
}

export interface ProvinceOverviewReward {
  id: string;
  type: string;
  amount: number;
  subType?: string;
}
