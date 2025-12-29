export interface Tome {
  id: string;
  name: string;
  description: string;
  rarity: number;
  spellFragments: number;
  iconId: string;
  rewards: Reward[];
  type: string;
}

export interface Reward {
  type: string;
  subType: string;
  amount: number;
}
