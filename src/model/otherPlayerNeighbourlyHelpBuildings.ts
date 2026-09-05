export interface OtherPlayerNeighbourlyHelpBuildingsResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: ResponseData;
}

export interface ResponseData {
  player: Player;
  rewards: Rewards;
  buildings: Building[];
}

export interface Building {
  entityConfigId: string;
  entityId: number;
  type: string;
}

export interface Player {
  player_id: number;
  name: string;
  avatar: string;
  race: string;
  rank: number;
  city_name: string;
  location: Location;
}

export interface Location {
  r: number;
  q: number;
}

export interface Rewards {
  resources: Resources;
}

export interface Resources {
  money: number;
}
