// src/fellowship-adventure/FaSummary.tsx
import React, { useMemo } from 'react';
import { Box, Button, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { getAccountById } from '../elvenar/AccountManager';
import { Badges, getBadgeMap } from '../model/badges';
import { useTabStore } from '../util/tabStore';

interface FaSummaryProps {
  badges: Badges | undefined;
  badgesInProduction: Record<string, Record<number, number>>;
  importedStock?: Record<string, Partial<Badges>>;
}

export const FaSummary: React.FC<FaSummaryProps> = ({
  badges = {} as Badges,
  badgesInProduction = {},
  importedStock = {},
}) => {
  const [BADGE_MAP, setBadgeMap] = React.useState<Record<string, string>>({});

  const accountId = useTabStore((state) => state.accountId);
  if (!accountId) return <Typography>No account selected.</Typography>;

  const removeImportedStock = useTabStore((state) => state.removeImportedStock);
  const clearImportedStock = useTabStore((state) => state.clearImportedStock);

  const accountData = getAccountById(accountId);
  if (!accountData) return <Typography>Account data not found.</Typography>;
  const { waypoints, chests, currentStage } = accountData.faDataStore || { waypoints: {}, chests: {}, currentStage: 1 };

  // Fetch our own readable name so we don't accidentally import our own clipboard export
  const myOwnerName = accountData?.cityQuery?.userData?.user_name || accountId;

  React.useEffect(() => {
    async function fetchBadgeMap() {
      const badgeMap = await getBadgeMap();
      setBadgeMap(badgeMap);
    }
    void fetchBadgeMap();
  }, []);

  const stats = useMemo(() => {
    const chestList = Object.values(chests);

    const getBadgeTotals = (chestSubset: typeof chestList) => {
      const totals: Record<string, { current: number; max: number }> = {};
      chestSubset.forEach((c) => {
        if (!totals[c.badgeType]) totals[c.badgeType] = { current: 0, max: 0 };
        totals[c.badgeType].current += c.currentValue || 0;
        totals[c.badgeType].max += c.maxValue;
      });
      return totals;
    };

    const stageChests = chestList.filter((c) => c.stage === currentStage);
    const startChests = stageChests.filter((c) => c.color === 'start');
    const orangeChests = stageChests.filter((c) => c.color === 'orange');
    const blueChests = stageChests.filter((c) => c.color === 'blue');
    const greenChests = stageChests.filter((c) => c.color === 'green');
    const multiChests = stageChests.filter((c) => c.isMultiColored);

    const merge = (...args: (typeof chestList)[]) => getBadgeTotals(args.flat());

    return {
      orangeOnly: merge(startChests, orangeChests),
      blueOnly: merge(startChests, blueChests),
      greenOnly: merge(startChests, greenChests),
      orangeFull: merge(
        startChests,
        orangeChests,
        multiChests.filter((c) => c.color !== 'orange'),
      ),
      blueFull: merge(
        startChests,
        blueChests,
        multiChests.filter((c) => c.color !== 'blue'),
      ),
      greenFull: merge(
        startChests,
        greenChests,
        multiChests.filter((c) => c.color !== 'green'),
      ),
      total: getBadgeTotals(stageChests),
    };
  }, [waypoints, chests, currentStage]);

  // Ignore items matching either our raw ID or our friendly name
  const importedIds = Object.keys(importedStock).filter((id) => id !== accountId && id !== myOwnerName);

  const removeImportedAccount = (idToRemove: string) => {
    if (accountId) removeImportedStock(accountId, idToRemove);
  };

  const clearAllImports = () => {
    if (accountId) clearImportedStock(accountId);
  };

  const handleCopyNeeded = (title: string, data: Record<keyof Badges, { current: number; max: number }>) => {
    const neededLines: string[] = [];
    const completedLines: string[] = [];

    Object.entries(data)
      .sort(([badgeA], [badgeB]) => {
        const nameA = BADGE_MAP[badgeA] || badgeA;
        const nameB = BADGE_MAP[badgeB] || badgeB;
        return nameA.localeCompare(nameB);
      })
      .forEach(([badge, d]) => {
        const badgeKey = badge as keyof Badges;
        const myAvailable = badges?.[badgeKey] || 0;
        const myProducing = badgesInProduction[badgeKey]
          ? Object.values(badgesInProduction[badgeKey]).reduce((a, b) => a + b, 0) / 100
          : 0;

        const importedAvailable = Object.entries(importedStock).reduce(
          (sum, [id, memberBadges]) => sum + (id !== accountId && id !== myOwnerName ? memberBadges[badgeKey] || 0 : 0),
          0,
        );

        const totalEffectiveCurrent = Math.trunc(d.current + myAvailable + myProducing + importedAvailable);
        const needed = Math.max(0, d.max - totalEffectiveCurrent);
        const displayName = BADGE_MAP[badge] || badge.replace(/_/g, ' ');

        if (needed > 0) {
          neededLines.push(`- ${displayName}: ${needed}`);
        } else {
          completedLines.push(`- ${displayName} ✔`);
        }
      });

    const finalLines: string[] = [`**${title} (Stage ${currentStage})**`];

    if (neededLines.length > 0) {
      finalLines.push('**Still Needed:**');
      finalLines.push(...neededLines);
    } else {
      finalLines.push('All requirements satisfied! ✔');
    }

    if (completedLines.length > 0) {
      finalLines.push('');
      finalLines.push('**Completed / Stocked:**');
      finalLines.push(...completedLines);
    }

    navigator.clipboard
      .writeText(finalLines.join('\n'))
      .catch((err) => console.error('ElvenAssist: Failed to copy to clipboard:', err));
  };

  const renderPanel = (title: string, data: Record<keyof Badges, { current: number; max: number }>, width: string) => (
    <Paper variant='outlined' sx={{ p: 2, flex: width }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Tooltip title='Copy remaining needs to clipboard' arrow>
          <IconButton
            size='small'
            onClick={() => handleCopyNeeded(title, data)}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
              <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
            </svg>
          </IconButton>
        </Tooltip>
      </Box>

      {Object.entries(data)
        .sort(([badgeA], [badgeB]) => {
          const nameA = BADGE_MAP[badgeA] || badgeA;
          const nameB = BADGE_MAP[badgeB] || badgeB;
          return nameA.localeCompare(nameB);
        })
        .map(([badge, d]) => renderBadgeProgress(badge as keyof Badges, d))}
    </Paper>
  );

  const renderBadgeProgress = (badgeName: keyof Badges, data: { current: number; max: number }) => {
    const myAvailable = badges?.[badgeName] || 0;
    const myProducing = badgesInProduction[badgeName]
      ? Object.values(badgesInProduction[badgeName]).reduce((a, b) => a + b, 0) / 100
      : 0;

    const importedAvailable = Object.entries(importedStock).reduce(
      (sum, [id, memberBadges]) => sum + (id !== accountId && id !== myOwnerName ? memberBadges[badgeName] || 0 : 0),
      0,
    );

    const totalEffectiveCurrent = Math.trunc(data.current + myAvailable + myProducing + importedAvailable);
    const isComplete = totalEffectiveCurrent >= data.max;
    const needed = Math.max(0, data.max - totalEffectiveCurrent);

    return (
      <Box
        key={badgeName}
        sx={{
          mb: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          bgcolor: isComplete ? 'success.light' : 'warning.light',
          color: isComplete ? 'success.contrastText' : 'warning.contrastText',
          transition: 'background-color 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant='caption'
            sx={{
              textTransform: 'capitalize',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mr: 1,
            }}
          >
            {BADGE_MAP[badgeName] || badgeName.replace(/_/g, ' ')}
          </Typography>
          <Typography variant='caption' sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
            {isComplete ? '✔' : `Need: ${needed}`}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Helper to generate the content for the chip tooltip
  const renderTooltipContent = (id: string) => {
    const memberStock = importedStock[id] || {};
    const stockEntries = Object.entries(memberStock)
      .filter(([_, count]) => count !== undefined && count > 0)
      .sort(([badgeA], [badgeB]) => {
        const nameA = BADGE_MAP[badgeA] || badgeA;
        const nameB = BADGE_MAP[badgeB] || badgeB;
        return nameA.localeCompare(nameB);
      });

    if (stockEntries.length === 0) return 'No badges contributed';

    return (
      <Box sx={{ p: 0.5 }}>
        {stockEntries.map(([badge, count]) => (
          <Box key={badge} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant='caption'>{BADGE_MAP[badge] || badge.replace(/_/g, ' ')}</Typography>
            <Typography variant='caption' sx={{ fontWeight: 'bold' }}>
              {count}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, mx: '10%' }}>
      <Typography variant='h4' sx={{ mb: importedIds.length > 0 ? 1 : 3, fontWeight: 'bold' }}>
        Fellowship Adventure: Stage {currentStage}
      </Typography>

      {/* Imported Accounts Bar */}
      {importedIds.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Factoring {importedIds.length} member{importedIds.length > 1 ? 's' : ''}:
          </Typography>
          {importedIds.map((id) => (
            <Tooltip key={id} title={renderTooltipContent(id)} arrow placement='top'>
              <Chip
                label={id}
                size='small'
                onDelete={() => removeImportedAccount(id)}
                color='primary'
                variant='outlined'
              />
            </Tooltip>
          ))}
          {importedIds.length > 1 && (
            <Button
              size='small'
              color='error'
              onClick={clearAllImports}
              sx={{ textTransform: 'none', ml: 1, minWidth: 'auto', py: 0 }}
            >
              Clear All
            </Button>
          )}
        </Box>
      )}

      {/* Row 1: 3 Panels */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {renderPanel('Orange Requirements', stats.orangeOnly, '1 1 20%')}
        {renderPanel('Blue Requirements', stats.blueOnly, '1 1 20%')}
        {renderPanel('Green Requirements', stats.greenOnly, '1 1 20%')}
      </Box>

      {/* Row 2: 4 Panels */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {renderPanel('Orange + Multis', stats.orangeFull, '1 1 20%')}
        {renderPanel('Blue + Multis', stats.blueFull, '1 1 20%')}
        {renderPanel('Green + Multis', stats.greenFull, '1 1 20%')}
        {renderPanel('Total Stage', stats.total, '1 1 20%')}
      </Box>
    </Box>
  );
};
