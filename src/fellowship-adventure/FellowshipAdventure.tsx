/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react';
import { FaQuest, getAccountById } from '../elvenar/AccountManager';
import { useTabStore } from '../util/tabStore';
import { Box, Button, Stack } from '@mui/material';
import { ProductionBadgeInfo } from './ProductionBadgeInfo';
import { ProductionTimeline } from './ProductionTimeline';
import { CityEntity } from '../model/cityEntity';
import { refreshCity } from '../city/CityGrid/refreshCity';
import { generateCity } from '../city/generateCity';
import { getEffects } from '../elvenar/sendEffectsQuery';
import FaProgress from './FaProgress';
import { Badges } from '../model/badges';
import FaControlPanel from './FaControlPanel';
import { badgeSpriteInfo } from './badgeSpriteInfo';

export function FellowshipAdventure() {
  const [badgesInProduction, setBadgesInProduction] = React.useState<Record<string, Record<number, number>>>({});
  const [timestamp, setTimestamp] = React.useState(Date.now());
  const [faRequirements, setFaRequirements] = React.useState<Record<string, FaQuest>>({});
  const [badges, setBadges] = React.useState<Badges | undefined>(undefined);
  const [f, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const [mmEnchantmentEnabled, setMmEnchantmentEnabled] = React.useState<boolean>(false);
  const [enchantmentBonus, setEnchantmentBonus] = React.useState<number>(50);

  const accountId = useTabStore((state) => state.accountId);

  React.useEffect(() => {
    async function fetchCityData() {
      if (!accountId) {
        return;
      }
      const accountData = getAccountById(accountId);
      if (!accountData || !accountData.cityQuery || !accountData.cityQuery.cityEntities) {
        return;
      }
      const entities = await generateCity(accountData);
      const effects = await getEffects();
      const goodsProductionEffects = effects.filter((r) => r.action === 'manufactories_production_boost');
      let factor = 1;
      for (const effect of goodsProductionEffects) {
        const origin = effect.origins?.[0];
        if (!origin) {
          continue;
        }

        const building = entities.q.find((r) => r.cityentity_id.startsWith(origin));

        if (building) {
          const f = effect.values?.[`${building.level}`] || 0;
          factor += f;
        }
      }

      const relicBoosts = accountData.cityQuery.relicBoosts;

      const boostedGoods = Object.fromEntries(
        accountData.cityQuery.boostedGoods.map((r) => [
          r,
          (relicBoosts[`relic_${r.replace(/sentient|ascended/, '')}` as keyof typeof relicBoosts] || 1) + factor - 1,
        ]),
      );

      const faRequirements = accountData.cityQuery.faRequirements;

      const badgesInProduction = extractBadgesInProduction(
        accountData.cityQuery.cityEntities,
        boostedGoods,
        faRequirements,
        mmEnchantmentEnabled,
        enchantmentBonus,
      );

      const badges = accountData.cityQuery.badges;

      setBadgesInProduction(badgesInProduction);
      setTimestamp(accountData.cityQuery.timestamp);
      setFaRequirements(faRequirements);
      setBadges(badges);
    }
    fetchCityData();
  }, [f, accountId, mmEnchantmentEnabled, enchantmentBonus]);

  const badgeList = Object.values(faRequirements)
    .sort((a, b) => a.id - b.id)
    .map((z) => z.badge);

  const spriteUrl = chrome.runtime.getURL('sprite.png');

  const faProgressItems = badgeList
    .filter((r) => badgeSpriteInfo[r])
    .map((badge) => {
      const req = faRequirements[badge];
      const spriteInfo = badgeSpriteInfo[badge]!;

      const storageValue = badges ? badges[badge as keyof Badges] || 0 : 0;
      const value = (req.currentProgress / req.maxProgress) * 100;

      const totalValue = Math.round(value) + storageValue * 100;
      const displayValue = `${Math.round(totalValue) / 100}`;

      const inProduction =
        badgesInProduction[badge] && Object.values(badgesInProduction[badge]).reduce((a, b) => a + b, 0);
      const futureValue = (inProduction && totalValue + inProduction) || undefined;
      const displayFutureValue = (futureValue && `${Math.round(futureValue) / 100}`) || undefined;
      return {
        id: badge,
        name: spriteInfo.name,
        value,
        displayValue,

        futureValue,
        displayFutureValue,

        spriteX: spriteInfo.x * 26,
        spriteY: spriteInfo.y * 26,
      };
    });
  return (
    <Stack>
      <Stack direction='row'>
        <Button onClick={() => refreshCity(accountId, forceUpdate)}>Refresh City</Button>
      </Stack>
      <Box display='flex' width='100%'>
        <Stack sx={{ flex: '0 0 auto', alignSelf: 'flex-start' }}>
          <Box>
            <FaProgress spriteUrl={spriteUrl} items={faProgressItems} />
          </Box>
          <Box>
            <FaControlPanel
              mmEnchantmentEnabled={mmEnchantmentEnabled}
              onToggleMmEnchantment={setMmEnchantmentEnabled}
              enchantmentBonus={enchantmentBonus}
              onEnchantmentBonusChange={setEnchantmentBonus}
            />
          </Box>
        </Stack>
        <Box sx={{ flex: '1 1 0%', minWidth: 0 }}>
          <ProductionTimeline badgesInProduction={badgesInProduction} timestamp={timestamp} />
        </Box>
      </Box>
    </Stack>
  );
}

function extractBadgesInProduction(
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
    } satisfies ProductionBadgeInfo);

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

  const grpi = () => ({} as Record<number, number>);

  const goldenBracelets1 = entities
    .filter((r) => r.level > 1 && faRequirements['golden_bracelet'])
    .filter((r) => /^marble_|steel_|planks_/.test(r.state?.current_product?.asset_name || ''))
    .map(mapr2);

  console.log('Extracted marble/steel/planks badges (1):', goldenBracelets1);

  const goldenBracelets = goldenBracelets1.reduce(grpr2('golden_bracelet'), grpi());

  console.log('Extracted marble/steel/planks badges:', goldenBracelets);

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
