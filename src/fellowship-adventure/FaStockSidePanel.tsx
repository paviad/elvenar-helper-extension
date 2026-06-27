// src/fellowship-adventure/FaStockSidePanel.tsx
import React from 'react';
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

interface FaStockSidePanelProps {
  badges: Badges | undefined;
}

export const FaStockSidePanel: React.FC<FaStockSidePanelProps> = ({ badges = {} as Badges }) => {
  const accountId = useTabStore((state) => state.accountId);
  const accountData = accountId ? getAccountById(accountId) : null;

  // Safely extract the human-readable name, falling back to the ID if missing
  const ownerName = accountData?.cityQuery?.userData?.user_name || accountId;

  // Filter and sort badges that have a count greater than 0
  const activeStock = Object.entries(badges)
    .filter(([_, count]) => count > 0)
    .sort(([badgeA], [badgeB]) => {
      const nameA = BADGE_MAP[badgeA] || badgeA;
      const nameB = BADGE_MAP[badgeB] || badgeB;
      return nameA.localeCompare(nameB);
    });

  const handleCopyStock = () => {
    if (activeStock.length === 0) {
      navigator.clipboard
        .writeText(`**My Current FA Badge Stock (${ownerName}):**\nNo badges in stock 🪙`)
        .catch(() => {});
      return;
    }

    const lines = [`**My Current FA Badge Stock (${ownerName}):**`];
    activeStock.forEach(([badge, count]) => {
      const displayName = BADGE_MAP[badge] || badge.replace(/_/g, ' ');
      lines.push(`- ${displayName} (${badge}): ${count}`);
    });

    navigator.clipboard.writeText(lines.join('\n')).catch((err) => {
      console.error('ElvenAssist: Failed to copy stock to clipboard:', err);
    });
  };

  return (
    <Paper variant='outlined' sx={{ p: 2, maxWidth: 320, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant='subtitle1' sx={{ fontWeight: 700, color: 'text.primary' }}>
          My Badge Stock
        </Typography>
        <Tooltip title='Copy stock summary to clipboard' arrow placement='left'>
          <IconButton
            size='small'
            onClick={handleCopyStock}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {activeStock.length === 0 ? (
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1, textAlign: 'center' }}
          >
            No badges currently in stock.
          </Typography>
        ) : (
          activeStock.map(([badge, count]) => (
            <Box
              key={badge}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 1.2,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'action.selected',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {BADGE_MAP[badge] || badge.replace(/_/g, ' ')}
              </Typography>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 800,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 1,
                  py: 0.1,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                }}
              >
                {count}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};
