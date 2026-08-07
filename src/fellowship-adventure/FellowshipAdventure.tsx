// src/fellowship-adventure/FellowshipAdventure.tsx
import React from 'react';
import { Box, Stack } from '@mui/material';
import { getFromStorage, saveToStorage } from '../chrome/storage';
import { generateCity } from '../city/generateCity';
import { getAccountById } from '../elvenar/AccountManager';
import { AccountData, FaQuest } from '../elvenar/Accounts';
import { getEffects } from '../elvenar/getEffects';
import { Badges } from '../model/badges';
import { useTabStore } from '../util/tabStore';
import { badgeSpriteInfo } from './badgeSpriteInfo';
import { extractBadgesInProduction } from './extractBadgesInProduction';
import FaControlPanel from './FaControlPanel';
import FaProgress from './FaProgress';
import { FaStockImport } from './FaStockImport';
import { FaStockSidePanel } from './FaStockSidePanel';
import { FaSummary } from './FaSummary';
import { ProductionTimeline } from './ProductionTimeline';

export function FellowshipAdventure() {
  const [badgesInProduction, setBadgesInProduction] = React.useState<Record<string, Record<number, number>>>({});
  const [timestamp, setTimestamp] = React.useState(Date.now());
  const [faRequirements, setFaRequirements] = React.useState<Record<string, FaQuest>>({});
  const [badges, setBadges] = React.useState<Badges | undefined>(undefined);

  const [endTime, setEndTime] = React.useState<number | undefined>(undefined);
  // New state for detached check
  const [isDetached, setIsDetached] = React.useState<boolean>(false);

  const [mmEnchantmentEnabled, setMmEnchantmentEnabled] = React.useState<boolean>(false);
  const [enchantmentBonus, setEnchantmentBonus] = React.useState<number>(50);
  // The badge maths feeds off both of the above, and reading them from storage is async.
  // Without this gate the maths ran once with the defaults and again with the stored
  // values, two overlapping async passes whose results landed in whichever order they
  // finished — so the badge counts could settle on the wrong enchantment bonus.
  const [paramsLoaded, setParamsLoaded] = React.useState(false);

  const accountId = useTabStore((state) => state.accountId);
  const accountData = useTabStore((state) => state.accountData);
  const forceUpdate = useTabStore((state) => state.forceUpdate);

  // Access the scoped store and actions
  const importedStockByAccount = useTabStore((state) => state.importedStockByAccount);
  const addImportedStock = useTabStore((state) => state.addImportedStock);

  // Extract ONLY the stock imported for the currently viewed account
  const currentImportedStock = accountId ? importedStockByAccount[accountId] || {} : {};

  React.useEffect(() => {
    if (!accountId) {
      return;
    }

    let cancelled = false;
    setParamsLoaded(false);

    async function loadFaParameters() {
      try {
        const faParameters = await getFromStorage(`faParameters_${accountId}`);
        if (cancelled) {
          return;
        }
        if (faParameters) {
          const { mmEnchantmentEnabled, enchantmentBonus } = JSON.parse(faParameters) as {
            mmEnchantmentEnabled: boolean;
            enchantmentBonus: number;
          };
          setMmEnchantmentEnabled(mmEnchantmentEnabled);
          setEnchantmentBonus(enchantmentBonus);
        }
      } catch (error) {
        /* ignore */
      }
      // Set even when nothing was stored, or when parsing threw: the defaults are then
      // the settled answer and the maths below is free to run.
      if (!cancelled) {
        setParamsLoaded(true);
      }
    }

    void loadFaParameters();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  React.useEffect(() => {
    if (!accountId) {
      return;
    }

    if (!accountData) {
      return;
    }

    if (!paramsLoaded) {
      return;
    }

    setIsDetached(accountData.isDetached);

    let cancelled = false;

    async function fetchCityData(accountData: AccountData) {
      if (!accountData.cityQuery || !accountData.cityQuery.cityEntities) {
        return;
      }

      const entities = await generateCity(accountData);
      const effects = await getEffects();
      if (cancelled) {
        return;
      }
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

      setEndTime(accountData.faEndTime);
    }
    void fetchCityData(accountData);
    return () => {
      cancelled = true;
    };
  }, [accountId, accountData, mmEnchantmentEnabled, enchantmentBonus, forceUpdate, paramsLoaded]);

  const setMmEnchantmentEnabled2 = React.useCallback(
    (enabled: boolean) => {
      async function setAndSave(enabled: boolean) {
        const faParameters = {
          mmEnchantmentEnabled: enabled,
          enchantmentBonus,
        };

        await saveToStorage(`faParameters_${accountId}`, JSON.stringify(faParameters));
        setMmEnchantmentEnabled(enabled);
      }
      void setAndSave(enabled);
    },
    [setMmEnchantmentEnabled, enchantmentBonus, accountId],
  );

  const setEnchantmentBonus2 = React.useCallback(
    (bonus: number) => {
      async function setAndSave(bonus: number) {
        const faParameters = {
          mmEnchantmentEnabled,
          enchantmentBonus: bonus,
        };

        await saveToStorage(`faParameters_${accountId}`, JSON.stringify(faParameters));
        setEnchantmentBonus(bonus);
      }
      void setAndSave(bonus);
    },
    [setEnchantmentBonus, mmEnchantmentEnabled, accountId],
  );

  const badgeList = Object.values(faRequirements)
    .sort((a, b) => a.id - b.id)
    .map((z) => z.badge);

  const spriteUrl = chrome.runtime.getURL('sprite.png');

  const faProgressItems = badgeList
    .filter((r) => badgeSpriteInfo[r])
    .map((badge) => {
      const req = faRequirements[badge];
      const spriteInfo = badgeSpriteInfo[badge];

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

  if (isDetached) {
    return (
      <div style={styles.emptyStateContainer}>
        <div style={styles.emptyStateContent}>
          <div style={styles.emptyIcon}>💾</div>
          <h2 style={styles.emptyTitle}>Data Unavailable</h2>
          <p style={styles.emptySubtitle}>
            Fellowship Adventure data is not available for saved (detached) cities.
            <br />
            Please switch to a live city view.
          </p>
        </div>
      </div>
    );
  }

  if (!endTime) {
    return (
      <div style={styles.emptyStateContainer}>
        <div style={styles.emptyStateContent}>
          <div style={styles.emptyIcon}>📯</div>
          <h2 style={styles.emptyTitle}>No Fellowship Adventure currently in progress</h2>
          <p style={styles.emptySubtitle}>
            If an event has just started, please <strong>reload the game tab</strong> to fetch the latest data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Stack>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
        }}
      >
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
          <Box>
            <FaStockSidePanel badges={badges}></FaStockSidePanel>
          </Box>
          <Box>
            <FaStockImport
              onImportSuccess={(memberName, badges) => {
                if (accountId) addImportedStock(accountId, memberName, badges);
              }}
            />
          </Box>
        </Stack>
        <Stack sx={{ flex: '1 1 0%', minWidth: 0 }}>
          <Box>
            <ProductionTimeline badgesInProduction={badgesInProduction} timestamp={timestamp} endTime={endTime} />
          </Box>
          <FaSummary
            badges={badges}
            badgesInProduction={badgesInProduction || {}}
            importedStock={currentImportedStock}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  emptyStateContainer: {
    height: '60vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px dashed #e2e8f0',
    marginTop: '20px',
  },
  emptyStateContent: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '500px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '24px',
    filter: 'grayscale(100%) opacity(0.5)',
    cursor: 'default',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#64748b',
    marginBottom: '12px',
    lineHeight: '1.2',
    marginTop: 0,
  },
  emptySubtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5',
  },
};
