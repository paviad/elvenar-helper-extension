export interface Trade {
  id: number;
  offer: Need;
  need: Need;
  trader: Trader;
  expiresIn: number;
  traderDiscovered: boolean;
}

export interface Need {
  good_id: string;
  value: number;
}

export interface Trader {
  player_id: number;
  name: string;
  avatar: string;
  guild_info: GuildInfo;
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
