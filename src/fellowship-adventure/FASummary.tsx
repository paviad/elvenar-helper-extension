import React, { useMemo } from 'react';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { getAccountById } from '../elvenar/AccountManager';
import { Badges } from '../model/badges';
import { useTabStore } from '../util/tabStore';

const BADGE_MAP: Record<string, string> = {
  arcane_residue: 'Arcane Residue',
  badge_blacksmith: 'Blacksmiths',
  badge_brewery: 'Breweries',
  badge_carpenters: 'Carpenters',
  badge_farmers: 'Farmers',
  badge_unit: 'Elvarian',
  badge_wonderhelper: 'Wonder Society',
  diamond_necklace: 'Diamond Necklace',
  druid_staff: 'Druid Staff',
  elegant_statue: 'Elegant Statue',
  enchanted_tiara: 'Enchanted Tiara',
  ghost_in_a_bottle: 'Ghost in a bottle',
  golden_bracelet: 'Golden Bracelet',
  money_sack: 'Sack of Coins',
  recycled_potion: 'Recycled Potion',
  witch_hat: 'Witch Hat',
};

interface FaSummaryProps {
  badges: Badges | undefined;
  badgesInProduction: Record<string, Record<number, number>>;
}

export const FaSummary: React.FC<FaSummaryProps> = ({ badges = {} as Badges, badgesInProduction = {} }) => {
  const accountId = useTabStore((state) => state.accountId);
  if (!accountId) return <Typography>No account selected.</Typography>;
  const accountData = getAccountById(accountId);
  if (!accountData) return <Typography>Account data not found.</Typography>;
  const { waypoints, chests, currentStage } = accountData.faDataStore || { waypoints: {}, chests: {}, currentStage: 1 };

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

    // Merge helper
    const merge = (...args: (typeof chestList)[]) => getBadgeTotals(args.flat());

    return {
      // 1-3: Single Color + Start
      orangeOnly: merge(startChests, orangeChests),
      blueOnly: merge(startChests, blueChests),
      greenOnly: merge(startChests, greenChests),
      // 4-6: Single Color + Start + Other Multis
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
      // 7: Total
      total: getBadgeTotals(stageChests),
    };
  }, [waypoints, chests, currentStage]);

  // Helper to construct and copy badge text summaries to the clipboard
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
          ? Object.values(badgesInProduction[badgeKey]).reduce((a, b) => a + b, 0) / 10
          : 0;
        const totalEffectiveCurrent = Math.trunc(d.current + myAvailable + myProducing);
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

    navigator.clipboard.writeText(finalLines.join('\n')).catch((err) => {
      console.error('ElvenAssist: Failed to copy to clipboard:', err);
    });
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
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            {/* Minimalist SVG Copy Icon */}
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

      {/* Sort entries alphabetically by their DISPLAY name mapping */}
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
    // Treat available player stock + working queues as already virtually "delivered"
    const myAvailable = badges?.[badgeName] || 0;
    const myProducing = badgesInProduction[badgeName]
      ? Object.values(badgesInProduction[badgeName]).reduce((a, b) => a + b, 0) / 10
      : 0;
    const totalEffectiveCurrent = Math.trunc(data.current + myAvailable + myProducing);

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

  return (
    <Box sx={{ p: 3, mx: '10%' }}>
      <Typography variant='h4' sx={{ mb: 3, fontWeight: 'bold' }}>
        Fellowship Adventure: Stage {currentStage}
      </Typography>

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
