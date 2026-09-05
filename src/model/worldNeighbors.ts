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
  /**
   * Not from the wire: the moment this neighbor's help cooldown runs out, stamped by
   * `processWorldNeighbors`. `cool_down` is the seconds left when the response arrived and nothing
   * decrements it afterwards, so a list fetched an hour ago would otherwise read as though it had
   * just been fetched. Absent on a neighbor who is already off cooldown.
   */
  cooldownEndsAt?: number;
  /**
   * Not from the wire: when the help loop sent this neighbor help, set by `markHelpSent`. Stands in
   * for the cooldown until the server's `updateProvince` push or a fresh neighbor list replaces the
   * entry, so a neighbor already helped is never offered again in the meantime.
   */
  helpSentAt?: number;
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
