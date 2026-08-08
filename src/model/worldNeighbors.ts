export interface WorldNeighborsResponse {
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: WorldNeighbor[];
}

export interface WorldNeighbor {
  r: number;
  q: number;
  player_id: number;
  known: boolean;
  name: string;
  race: Race;
  technology_section: number;
  guild_info?: GuildInfo;
  hasAncientWonder?: boolean;
  avatar: string;
  help_back_count_down?: number;
  cool_down?: number;
}

interface GuildInfo {
  id: number;
  name: string;
  banner: Banner;
}

interface Banner {
  shapeId: string;
  shapeColor: number;
  symbolId: string;
  symbolColor: number;
}

type Race = 'elves' | 'humans';
