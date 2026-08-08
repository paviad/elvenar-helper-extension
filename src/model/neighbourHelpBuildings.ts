export interface NeighbourHelpBuildingsResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: NeighbourHelpData;
}

export interface NeighbourHelpData {
  player: Player;
  rewards: Rewards;
  buildings: NeighbourHelpBuilding[];
}

export interface NeighbourHelpBuilding {
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
  next_help_back_in: number;
  city_name: string;
  guild_info: GuildInfo;
  location: Location;
}

export interface GuildInfo {
  id: number;
  name: string;
  banner: Banner;
}

export interface Banner {
  shapeId: string;
  shapeColor: number;
  symbolId: string;
  symbolColor: number;
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
  supplies: number;
}
