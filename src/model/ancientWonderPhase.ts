export interface AncientWonderPhase {
  __class__: AncientWonderPhaseClass;
  playerId: number;
  entityBaseName: string;
  resourceId: string;
  insertionCost?: number;
  numRunes?: number;
  forgeResourceId?: ForgeResourceID;
  numForgeResources?: number;
  runesMask?: number;
  investedKnowledgePoints?: number;
  requiredKnowledgePoints?: number;
  contributions?: Contribution[];
  receiverKpLimit?: number;
  isFavourite?: boolean;
}

export enum AncientWonderPhaseClass {
  ResearchPhaseVO = 'ResearchPhaseVO',
  RunesPhaseVO = 'RunesPhaseVO',
}

export interface Contribution {
  __class__: ContributionClass;
  rank: number;
  player: Player;
  knowledgePoints?: number;
  reward?: ContributionReward;
}

export enum ContributionClass {
  ResearchContributionVO = 'ResearchContributionVO',
}

export interface Player {
  __class__: PlayerClass;
  player_id: number;
  name: string;
  avatar?: string;
  guild_info?: GuildInfo;
}

export enum PlayerClass {
  PlayerVO = 'PlayerVO',
}

export interface GuildInfo {
  __class__: GuildInfoClass;
  id: number;
  name: string;
  banner: Banner;
}

export enum GuildInfoClass {
  GuildInfoVO = 'GuildInfoVO',
}

export interface Banner {
  __class__: BannerClass;
  shapeId: ShapeID;
  shapeColor: number;
  symbolId: SymbolID;
  symbolColor: number;
}

export enum BannerClass {
  GuildBannerVO = 'GuildBannerVO',
}

export enum ShapeID {
  Guildbanner04 = 'guildbanner04',
  Guildbanner05 = 'guildbanner05',
  Guildbanner06 = 'guildbanner06',
  Guildbanner07 = 'guildbanner07',
  Guildbanner09 = 'guildbanner09',
  Guildbanner10 = 'guildbanner10',
}

export enum SymbolID {
  Guildicon02 = 'guildicon02',
  Guildicon03 = 'guildicon03',
  Guildicon05 = 'guildicon05',
  Guildicon06 = 'guildicon06',
  Guildicon08 = 'guildicon08',
  Guildicon10 = 'guildicon10',
}

export interface ContributionReward {
  __class__: PurpleClass;
  icon: Icon;
  rewards: RewardElement[];
}

export enum PurpleClass {
  ResearchContributionRewardVO = 'ResearchContributionRewardVO',
}

export enum Icon {
  ChestBronze = 'chestBronze',
  ChestBrown = 'chestBrown',
  ChestGold = 'chestGold',
  ChestSilver = 'chestSilver',
}

export interface RewardElement {
  __class__: FluffyClass;
  type: Type;
  subType: string;
  amount: number;
}

export enum FluffyClass {
  RewardVO = 'RewardVO',
}

export enum Type {
  Good = 'good',
  Item = 'item',
}

export enum ForgeResourceID {
  BrokenShards = 'broken_shards',
  ShatteredOrbs = 'shattered_orbs',
}
