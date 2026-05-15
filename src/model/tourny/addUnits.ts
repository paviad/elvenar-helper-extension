export interface AddUnitsResponse {
  __class__: string;
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: TournyAddUnits;
}

export interface TournyAddUnits {
  __class__: string;
  unitTypeId: string;
  size: number;
}
