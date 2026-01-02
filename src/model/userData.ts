export interface ElvenarUserData {
  player_id:         number;
  city_name:         string;
  user_name:         string;
  race:              string;
  portrait_id:       string;
  playerType:        PlayerType;
  guild_info:        GuildInfo;
  technologySection: TechnologySection;
}

export interface GuildInfo {
  id:        number;
  name:      string;
  banner:    Banner;
}

export interface Banner {
  shapeId:     string;
  shapeColor:  number;
  symbolId:    string;
  symbolColor: number;
}

export interface PlayerType {
  value:    string;
}

export interface TechnologySection {
  guestRace:   string;
  index:       number;
  description: string;
  fontColor:   number;
}
