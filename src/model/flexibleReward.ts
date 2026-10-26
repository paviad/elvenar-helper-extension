import { Reward } from './tome';

/**
 * A reward the game sizes to the player's chapter: one reward for each chapter, the first
 * for chapter 1. A reward that names one - a tome's `frog_mana_RSK` x10 - stands for the
 * player's chapter's reward here, its amount multiplied.
 */
export interface FlexibleReward {
  id: string;
  rewards: Reward[];
}
