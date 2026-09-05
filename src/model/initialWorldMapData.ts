export interface InitialWorldMapDataResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: InitialWorldMapData;
}

export interface InitialWorldMapData {
  locations_to_scout: LocationsToScout[];
  player_world_map_area_vo: PlayerWorldMapAreaVo;
  scout: Scout;
  world_map_area_height: number;
  world_map_area_length: number;
}

export interface LocationsToScout {
  costs: number;
  location: Ation;
  state: State;
  difficulty: number;
  totalTime: number;
  distance: number;
  reducedTime: number;
}

export interface Ation {
  r: number;
  q: number;
}

export enum State {
  LockedCompleteBorderingProvinces = 'LOCKED_COMPLETE_BORDERING_PROVINCES',
  Unlocked = 'UNLOCKED',
}

export interface PlayerWorldMapAreaVo {
  id: string;
  provinces: Province[];
}

export interface Province {
  r: number;
  q: number;
  good_id?: string;
  player_encounters_amount?: number;
  total_encounters_amount?: number;
  distance?: number;
  player_id?: number;
  known?: boolean;
  name?: string;
  race?: string;
  technology_section?: number;
  guild_info?: GuildInfo;
  hasAncientWonder?: boolean;
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

export interface Scout {
  destination: Ation;
  instant_costs: number;
  time_left: number;
  total_time: number;
  difficulty: number;
}
