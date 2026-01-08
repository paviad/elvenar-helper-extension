export interface Quest {
  id: number;
  title: Title;
  type: QuestType;
  subType?: SubType;
  questGiverId: string;
  priority: number;
  state: State;
  successConditions: SuccessCondition[];
  flags?: number;
  rewards: Reward[];
  headline: string;
  description: string;
  accomplishedHeadline: string;
  accomplishedDescription: string;
  race: Race;
  args: Args;
}

export enum Args {
  NoRewardWindowShowRewardBlimpsOverspill = 'no-reward-window, show-reward-blimps, overspill',
  ShowInfoScreenNoReshowInfoScreen = 'show-info-screen, no-reshow-info-screen',
}

export type Race = 'humans' | 'elves';

export interface Reward {
  type: RewardType;
  subType: string;
  amount: number;
  iconType: string;
  quest_id: number;
  resources?: RewardResources;
}

export interface RewardResources {
  resources: ResourcesResources;
}

export interface ResourcesResources {
  badge_brewery?: number;
  badge_carpenters?: number;
  badge_farmers?: number;
  badge_blacksmith?: number;
  golden_bracelet?: number;
  diamond_necklace?: number;
  elegant_statue?: number;
  witch_hat?: number;
  druid_staff?: number;
  badge_wonderhelper?: number;
  badge_unit?: number;
  money_sack?: number;
  arcane_residue?: number;
  recycled_potion?: number;
  enchanted_tiara?: number;
  ghost_in_a_bottle?: number;
}

export enum RewardType {
  Good = 'good',
  RewardSelectionKit = 'reward_selection_kit',
}

export enum State {
  Accepted = 'accepted',
}

export enum SubType {
  MpeI = 'mpe_i',
}

export interface SuccessCondition {
  id: number;
  iconType: string;
  description: string;
  hint?: string;
  currentProgress?: number;
  maxProgress: number;
  progress?: number;
}

export enum Title {
  FellowshipAdventures = 'Fellowship Adventures',
  Tensions = 'Tensions',
}

export enum QuestType {
  Repeating = 'repeating',
  Story = 'story',
}
