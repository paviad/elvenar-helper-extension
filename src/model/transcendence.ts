export interface TranscendenceResponse {
  requestClass: string;
  requestMethod: string;
  responseData: TranscendenceRaw[];
}

export interface TranscendenceRaw {
  __class__:       string;
  buildingId:      number;
  costs:           Costs;
  effectsIds:      number[];
  remainingTime:   number;
  initialDuration: number;
  purchasableTime: number;
  state:           'active' | 'inactive';
  stageToUnlock:   number;
}

export interface Transcendence extends TranscendenceRaw {
  endTime: number;
}

export interface Costs {
  __class__: string;
  resources: Resources;
}

export interface Resources {
  __class__:       string;
  volatile_sigils: number;
}
