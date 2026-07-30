import { getGoodsNames } from '../elvenar/getGoodsNames';

export interface Badges {
  badge_brewery: number;
  badge_carpenters: number;
  badge_farmers: number;
  badge_blacksmith: number;
  golden_bracelet: number;
  diamond_necklace: number;
  elegant_statue: number;
  witch_hat: number;
  druid_staff: number;
  badge_wonderhelper: number;
  badge_unit: number;
  money_sack: number;
  arcane_residue: number;
  recycled_potion: number;
  enchanted_tiara: number;
  ghost_in_a_bottle: number;
}

export const badgeTypes: (keyof Badges)[] = [
  'badge_brewery',
  'badge_carpenters',
  'badge_farmers',
  'badge_blacksmith',
  'golden_bracelet',
  'diamond_necklace',
  'elegant_statue',
  'witch_hat',
  'druid_staff',
  'badge_wonderhelper',
  'badge_unit',
  'money_sack',
  'arcane_residue',
  'recycled_potion',
  'enchanted_tiara',
  'ghost_in_a_bottle',
];

export interface Relics {
  relic_crystal: number;
  relic_elixir: number;
  relic_gems: number;
  relic_magic_dust: number;
  relic_marble: number;
  relic_planks: number;
  relic_scrolls: number;
  relic_silk: number;
  relic_steel: number;
}

export const getBadgeMap = async (): Promise<Record<string, string>> => {
  const goodsNames = await getGoodsNames();
  const badgeMap: Record<string, string> = {};
  badgeTypes.forEach((badgeType) => {
    const displayName = goodsNames[badgeType] || badgeType;
    badgeMap[badgeType] = displayName;
  });
  return badgeMap;
};
