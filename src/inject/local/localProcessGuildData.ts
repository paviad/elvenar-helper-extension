import { ExtensionSharedInfo } from '../../model/extensionSharedInfo';

// eslint-disable-next-line @typescript-eslint/require-await
export const localProcessGuildData = async (responseText: string, sharedInfo: ExtensionSharedInfo) => {
  const untypedJson = JSON.parse(responseText);

  const json = untypedJson as [{ requestClass: string; requestMethod: string; responseData: unknown }];
  const guildService = json.filter((r) => r.requestClass === 'GuildService' && r.requestMethod === 'getGuild');

  const guildDataResponse = guildService as GuildDataResponse[];

  if (guildDataResponse.length === 0) {
    console.warn('Guild data response is empty');
    return;
  }

  let playerIds: number[] = [];

  for (const resp of guildDataResponse) {
    const playerIdsInResponse = resp.responseData.members.map((ranking) => ranking.player.player_id);
    if (playerIdsInResponse.length === 9) {
      playerIdsInResponse.pop();
    }
    playerIds = playerIds.concat(playerIdsInResponse);
  }

  // const playerIds = rankingsDataResponse[0].responseData.rankings.map((ranking) => ranking.player.player_id);

  console.log('Extracted player IDs from guild data:', playerIds);

  const serviceConstructor = window.aviad?.['de.innogames.onyx.city.ancientwonders.services.AncientWonderService'];
  const awService = serviceConstructor && new serviceConstructor();

  if (!awService) {
    console.error('AncientWonderService is not available on window.aviad');
    return;
  }

  for (const playerId of playerIds) {
    awService.getOtherPlayerAncientWonders(playerId, (z) => {
      // ignore
    });
  }
};

export interface GuildDataResponse {
  requestClass: string;
  requestMethod: string;
  responseData: GuildData;
}

export interface GuildData {
  __class__: string;
  id: number;
  name: string;
  description: string;
  banner: Banner;
  members: Member[];
  invitation_allowed: boolean;
  application_allowed: boolean;
  member_acquisition_type: string;
  created_at: number;
  rank: number;
  points: number;
  fellowship_rank: number;
  fellowship_points: number;
  trophies: Trophy[];
  level: number;
}

export interface Banner {
  __class__: string;
  shapeId: string;
  shapeColor: number;
  symbolId: string;
  symbolColor: number;
}

export interface Member {
  __class__: MemberClass;
  role_id?: number;
  rank: number;
  score: number;
  player: Player;
  joined_at: number;
  hasAncientWonder: boolean;
}

export enum MemberClass {
  GuildMembershipVO = 'GuildMembershipVO',
}

export interface Player {
  __class__: PlayerClass;
  player_id: number;
  name: string;
  avatar: string;
  race: Race;
  nhBackCountDownBoosted: boolean;
  online?: boolean;
}

export enum PlayerClass {
  GuildMemberVO = 'GuildMemberVO',
}

export enum Race {
  Elves = 'elves',
  Humans = 'humans',
}

export interface Trophy {
  __class__: string;
  id: string;
  amount: number;
  type: string;
}
