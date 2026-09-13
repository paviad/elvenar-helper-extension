import { FaQuest } from '../elvenar/Accounts';
import { CityEntity } from '../model/cityEntity';
import { ProductionBadgeInfo } from './ProductionBadgeInfo';

/**
 * Badges in production, per badge, keyed by when they finish (epoch milliseconds).
 *
 * `cityLoadedAt` is the city load's `cityQuery.timestamp`. A building's countdown counts from when
 * its state was reported - `stateAt` for one reported since the load, the load itself otherwise.
 * Reading every countdown against the load put a production started hours later hours too early.
 */
export function extractBadgesInProduction(
  entities: CityEntity[],
  cityLoadedAt: number,
  boostedGoods: Record<string, number>,
  faRequirements: Record<string, FaQuest>,
  mmEnchantmentEnabled: boolean,
  enchantmentBonus: number,
): Record<string, Record<number, number>> {
  const finishesAt = (r: CityEntity) => (r.stateAt ?? cityLoadedAt) + (r.state!.next_state_transition_in ?? 0) * 1000;

  const fltr = (s: string | RegExp) => (r: CityEntity) =>
    s instanceof RegExp
      ? s.test(r.state?.current_product?.asset_name || '')
      : r.state?.current_product?.asset_name === s;
  // Only entities whose current product the filters above matched reach either mapper, so the
  // state and its product are both there. A state that carries a product always carries a
  // countdown too; the fallback is for the type, which has to allow for the states that do not.
  const mapr = (r: CityEntity) => {
    const product = r.state!.current_product!;
    return {
      id: r.id,
      name: product.name!,
      asset_name: product.asset_name!,
      finishesAt: finishesAt(r),
      productionAmount: product.productionAmount,
    } satisfies ProductionBadgeInfo;
  };

  const mapr2 = (r: CityEntity) => {
    const product = r.state!.current_product!;
    const boostFactor = boostedGoods[product.asset_name?.replace(/_\d+$/, '') || ''] || 1;
    return {
      id: r.id,
      name: product.name!,
      asset_name: product.asset_name!,
      finishesAt: finishesAt(r),
      productionAmount:
        ((Object.entries(product.revenue.resources).find(([k, v]) => /marble|steel|planks/.test(k))?.[1] as number) ||
          0) * boostFactor,
    } satisfies ProductionBadgeInfo;
  };

  const grpr = (prodPerBadge: number) => (acc: Record<number, number>, curr: ProductionBadgeInfo) => ({
    ...acc,
    [curr.finishesAt]: (acc[curr.finishesAt] || 0) + (curr.productionAmount * 100) / prodPerBadge,
  });

  const grpr2 = (badge: string) => {
    const prodPerBadge = faRequirements[badge]?.maxProgress || 1;
    const mmBonusFactor = mmEnchantmentEnabled ? 1 + enchantmentBonus / 100 : 1;
    return (acc: Record<number, number>, curr: ProductionBadgeInfo) => ({
      ...acc,
      [curr.finishesAt]: Math.trunc(
        (acc[curr.finishesAt] || 0) + (curr.productionAmount * 100 * mmBonusFactor) / prodPerBadge,
      ),
    });
  };

  const grpi = () => ({}) as Record<number, number>;

  const goldenBracelets1 = entities
    .filter((r) => r.level > 1 && faRequirements['golden_bracelet'])
    .filter((r) => /^(marble_|steel_|planks_)/.test(r.state?.current_product?.asset_name || ''))
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

  return Object.fromEntries(
    Object.entries({
      golden_bracelet: goldenBracelets,
      diamond_necklace,
      elegant_statue,
      badge_brewery,
      badge_carpenters,
      badge_farmers,
      badge_blacksmith,
    }).map(([badge, byFinish]) => [badge, mergeCloseFinishes(byFinish)]),
  );
}

const MERGE_WINDOW_MS = 60 * 1000;

/**
 * Folds finishes that fall within a minute of the first in their run into one, kept at the last of
 * them so the badges are never shown as ready before they all are. Productions started one after
 * another report the same countdown seconds apart, and each would otherwise get a marker of its own.
 */
export function mergeCloseFinishes(byFinish: Record<number, number>): Record<number, number> {
  const merged: Record<number, number> = {};
  let runStart: number | undefined;
  let runEnd = 0;
  let runAmount = 0;
  for (const finish of Object.keys(byFinish)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (runStart !== undefined && finish - runStart > MERGE_WINDOW_MS) {
      merged[runEnd] = runAmount;
      runStart = undefined;
    }
    if (runStart === undefined) {
      runStart = finish;
      runAmount = 0;
    }
    runEnd = finish;
    runAmount += byFinish[finish];
  }
  if (runStart !== undefined) {
    merged[runEnd] = runAmount;
  }
  return merged;
}
