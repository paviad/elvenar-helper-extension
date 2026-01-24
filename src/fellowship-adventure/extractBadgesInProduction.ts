/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FaQuest } from '../elvenar/AccountManager';
import { CityEntity } from '../model/cityEntity';
import { ProductionBadgeInfo } from './ProductionBadgeInfo';

export function extractBadgesInProduction(
  entities: CityEntity[],
  boostedGoods: Record<string, number>,
  faRequirements: Record<string, FaQuest>,
  mmEnchantmentEnabled: boolean,
  enchantmentBonus: number,
): Record<string, Record<number, number>> {
  const fltr = (s: string | RegExp) => (r: CityEntity) =>
    s instanceof RegExp
      ? s.test(r.state?.current_product?.asset_name || '')
      : r.state?.current_product?.asset_name === s;
  const mapr = (r: CityEntity) =>
    ({
      id: r.id,
      name: r.state!.current_product!.name!,
      asset_name: r.state!.current_product!.asset_name!,
      next_state_transition_in: r.state!.next_state_transition_in,
      productionAmount: r.state!.current_product?.productionAmount,
    }) satisfies ProductionBadgeInfo;

  const mapr2 = (r: CityEntity) => {
    const boostFactor = boostedGoods[r.state?.current_product?.asset_name?.replace(/_\d+$/, '') || ''] || 1;
    return {
      id: r.id,
      name: r.state!.current_product!.name!,
      asset_name: r.state!.current_product!.asset_name!,
      next_state_transition_in: r.state!.next_state_transition_in,
      productionAmount:
        ((Object.entries(r.state!.current_product?.revenue.resources).find(([k, v]) =>
          /marble|steel|planks/.test(k),
        )?.[1] as number) || 0) * boostFactor,
    } satisfies ProductionBadgeInfo;
  };

  const grpr = (prodPerBadge: number) => (acc: Record<number, number>, curr: ProductionBadgeInfo) => ({
    ...acc,
    [curr.next_state_transition_in]:
      (acc[curr.next_state_transition_in] || 0) + (curr.productionAmount * 100) / prodPerBadge,
  });

  const grpr2 = (badge: string) => {
    const prodPerBadge = faRequirements[badge]?.maxProgress || 1;
    const mmBonusFactor = mmEnchantmentEnabled ? 1 + enchantmentBonus / 100 : 1;
    return (acc: Record<number, number>, curr: ProductionBadgeInfo) => ({
      ...acc,
      [curr.next_state_transition_in]: Math.trunc(
        (acc[curr.next_state_transition_in] || 0) + (curr.productionAmount * 100 * mmBonusFactor) / prodPerBadge,
      ),
    });
  };

  const grpi = () => ({}) as Record<number, number>;

  const goldenBracelets1 = entities
    .filter((r) => r.level > 1 && faRequirements['golden_bracelet'])
    .filter((r) => /^marble_|steel_|planks_/.test(r.state?.current_product?.asset_name || ''))
    .map(mapr2);

  const goldenBracelets = goldenBracelets1.reduce(grpr2('golden_bracelet'), grpi());

  const diamond_necklace = entities
    .filter(fltr(/(marble_|steel_|planks_)2/))
    .map(mapr)
    .reduce(grpr(4), grpi());
  const elegant_statue = entities
    .filter(fltr(/(marble_|steel_|planks_)3/))
    .map(mapr)
    .reduce(grpr(2), grpi());
  // const steel_2 = entities.filter(fltr('steel_2')).map(mapr).reduce(grpr(4), grpi());
  // const steel_3 = entities.filter(fltr('steel_3')).map(mapr).reduce(grpr(2), grpi());
  // const planks_2 = entities.filter(fltr('planks_2')).map(mapr).reduce(grpr(4), grpi());
  // const planks_3 = entities.filter(fltr('planks_3')).map(mapr).reduce(grpr(2), grpi());
  const badge_brewery = entities.filter(fltr('supplies_0')).map(mapr).reduce(grpr(25), grpi());
  const badge_carpenters = entities.filter(fltr('supplies_3')).map(mapr).reduce(grpr(10), grpi());
  const badge_farmers = entities.filter(fltr('supplies_4')).map(mapr).reduce(grpr(10), grpi());
  const badge_blacksmith = entities.filter(fltr('supplies_5')).map(mapr).reduce(grpr(5), grpi());

  return {
    golden_bracelet: goldenBracelets,
    diamond_necklace,
    elegant_statue,
    badge_brewery,
    badge_carpenters,
    badge_farmers,
    badge_blacksmith,
  };
}
