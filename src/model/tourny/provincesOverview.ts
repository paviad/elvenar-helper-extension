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
  /** Seconds left on the upgrade, as the server sent it — relative to when the response arrived. */
  upgradeTime?: number;
  /** Absolute epoch ms, derived from `upgradeTime` by the processor so it survives re-renders. */
  upgradeTimeEnd?: number;
}

export interface ProvinceOverviewReward {
  id: string;
  type: string;
  amount: number;
  subType?: string;
}
