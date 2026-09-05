export interface RankingsData {
  __class__: string;
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: ResponseData;
}

export interface ResponseData {
  __class__: string;
  length: number;
  rankings: Ranking[];
  pageIndex: number;
  category: string;
}

export interface Ranking {
  __class__: string;
  rank: number;
  points: number;
  player: Player;
  guildInfo?: GuildInfo;
}

export interface GuildInfo {
  __class__: string;
  id: number;
  name: string;
  banner: Banner;
  leaderName: string;
}

export interface Banner {
  __class__: string;
  shapeId: string;
  shapeColor: number;
  symbolId: string;
  symbolColor: number;
}

export interface Player {
  __class__: string;
  player_id: number;
  name: string;
  avatar: string;
}

export interface PagedRankingList {
  __class__: string;
  requestClass: string;
  requestMethod: string;
  requestId: number;
  responseData: PagedResponseData;
}

export interface PagedResponseData {
  __class__: string;
  length: number;
  rankings: Ranking[];
  pageIndex: number;
  category: string;
}
