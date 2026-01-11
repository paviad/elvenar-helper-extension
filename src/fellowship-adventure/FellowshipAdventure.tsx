/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react';
import { FaQuest, getAccountById } from '../elvenar/AccountManager';
import { useTabStore } from '../util/tabStore';
import { Box, Button, Stack } from '@mui/material';
import { ProductionTimeline } from './ProductionTimeline';
import { refreshCity } from '../city/CityGrid/refreshCity';
import { generateCity } from '../city/generateCity';
import { getEffects } from '../elvenar/sendEffectsQuery';
import FaProgress from './FaProgress';
import { Badges } from '../model/badges';
import FaControlPanel from './FaControlPanel';
import { badgeSpriteInfo } from './badgeSpriteInfo';
import { extractBadgesInProduction } from './extractBadgesInProduction';
import { smartCompress, smartDecompress } from '../util/compression';

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

      const exportData = {
        player: accountData.cityQuery.userData.user_name,
        timestamp: accountData.cityQuery.timestamp,
        badgesInProduction,
      };

      // const compressedString = await smartCompress(JSON.stringify(exportData));
      // console.log('FA Export Data:', compressedString);
      // const decompressed = await smartDecompress(compressedString);
      // console.log('FA Decompressed Data:', decompressed);
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
