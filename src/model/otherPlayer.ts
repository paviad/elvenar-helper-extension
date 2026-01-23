import { CityEntity } from './cityEntity';
import { UnlockedArea } from './unlockedArea';

export interface ResponseData {
  other_player:           OtherPlayerClass;
  city_map:               CityMap;
  technologySection:      number;
}

export interface CityMap {
  unlocked_areas:              UnlockedArea[];
  entities:                    CityEntity[];
}

export interface GuildInfo {
  id:        number;
}

export interface OtherPlayerClass {
  player_id:  number;
  name:       string;
  avatar:     string;
  race:       string;
  rank:       number;
  city_name:  string;
  guild_info?: GuildInfo;
  location:   Location;
}

export interface Location {
  r:         number;
  q:         number;
}
