export interface PotionEffect {
  id: string;
  iconId: string;
  boost: number;
  duration: number;
  state: string;
  level: number;
  name: string;
  techName: string;
  description: string;
  potionEffectIngredients: PotionEffectIngredient[];
  upgradeCost: number;
  nextBoost: number;
  nextDuration: number;
}

export interface PotionEffectIngredient {
  id: string;
  value?: number;
  factor?: number;
}
