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

export type Args = 'no-reward-window, show-reward-blimps, overspill' | 'show-info-screen, no-reshow-info-screen';

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

export type RewardType = 'good' | 'reward_selection_kit';

export type State = 'accepted';

export type SubType = 'mpe_i';

export interface SuccessCondition {
  id: number;
  iconType: string;
  description: string;
  hint?: string;
  totalProgress?: number;
  maxProgress: number;
  progress?: number;
}

export type Title = 'Fellowship Adventures' | 'Tensions';

export type QuestType = 'repeating' | 'story';
