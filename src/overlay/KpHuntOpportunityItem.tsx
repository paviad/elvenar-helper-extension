import React from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Icon for copy
import FavoriteIcon from '@mui/icons-material/Favorite'; // Icon for favorite
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Icon for gain
import VerifiedIcon from '@mui/icons-material/Verified'; // Icon for completion
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { relayToGame } from '../inject/relayToGame';
import { KpHuntData } from '../model/kpHuntData';

export type KpHuntOpportunity = KpHuntData & { id: string };

interface KpHuntOpportunityItemProps {
  opportunity: KpHuntOpportunity;
  runeCount: number;
  kpHuntImportantThreshold?: number;
  showDivider: boolean;
  onOpportunityClick?: (id: string) => void; // Optional handler if you want interaction
  onClearOpportunity?: (id: string) => void;
}

// Handler for copying summary text to clipboard securely
const handleCopy = (e: React.MouseEvent, text: string) => {
  e.stopPropagation(); // Prevent row click

  navigator.clipboard.writeText(text).catch((err) => {
    console.error('Unable to copy', err);
  });
};

// Handler for visiting a player
const handleVisitPlayer = (e: React.MouseEvent, opportunity: KpHuntData) => {
  e.stopPropagation(); // Prevent the list item click event from firing

  // TODO: Implement your visit logic here!
  console.log(`Ready to visit player: ${opportunity.playerId}`);

  relayToGame('visitPlayer', {
    playerId: opportunity.playerId,
    buildingId: opportunity.buildingFullId,
    baseName: opportunity.buildingId,
  });
};

// Adjust padding right to accommodate the secondary actions (Vertical Chips)
const paddingRight = 14;

export const KpHuntOpportunityItem: React.FC<KpHuntOpportunityItemProps> = ({
  opportunity,
  runeCount,
  kpHuntImportantThreshold,
  showDivider,
  onOpportunityClick,
  onClearOpportunity,
}) => {
  const theme = useTheme();

  // Calculate if profitable to complete
  const contributeToComplete = opportunity.totalKpNeeded - opportunity.investedKp;
  const extraContributionBeyondMinimal = contributeToComplete - opportunity.contributeAtLeast;
  const profitIfCompleted = opportunity.standToGain - extraContributionBeyondMinimal;
  const canCompleteProfitably = profitIfCompleted > 0;

  // Determine if this target meets or exceeds our high-priority threshold
  const isImportant = opportunity.standToGain >= (kpHuntImportantThreshold ?? 0);

  // Primary Summary string for clipboard
  const totalGetBack = opportunity.standToGain + opportunity.contributeAtLeast - opportunity.numberOfRunes * 15;
  const primaryRunesText =
    opportunity.numberOfRunes > 0
      ? ` plus ${opportunity.numberOfRunes} ${opportunity.numberOfRunes === 1 ? 'rune' : 'runes'}`
      : '';
  const primarySummaryText = `${opportunity.id} - ${opportunity.buildingName} - invest ${opportunity.contributeAtLeast} to get back a total of ${totalGetBack}${primaryRunesText}`;

  // Common Primary Text Component (Name + heart + copy)
  const PrimaryText = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: isImportant ? 700 : 500 }} color='text.primary'>
        {opportunity.buildingName}
      </Typography>
      {opportunity.isFavorite && (
        <Tooltip title='Favorite Player'>
          <FavoriteIcon sx={{ fontSize: 16, color: '#f44336' }} />
        </Tooltip>
      )}
      {isImportant && (
        <Tooltip title='High Profit Opportunity!'>
          <AutoAwesomeIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
        </Tooltip>
      )}
      <Tooltip title='Copy summary to clipboard'>
        <IconButton size='small' onClick={(e) => handleCopy(e, primarySummaryText)} sx={{ p: 0.5, ml: 0.5 }}>
          <ContentCopyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Build Pack Hunt Element (if available)
  let packHuntElement = null;
  if (opportunity.packHunt) {
    const p = opportunity.packHunt;
    const r1 = p.firstRunes > 0 ? `(${p.firstRunes})` : '';
    const r2 = p.secondRunes > 0 ? `(${p.secondRunes})` : '';
    const rx1 = p.firstRunes > 0 ? ` (and ${p.firstRunes} ${p.firstRunes === 1 ? 'rune' : 'runes'})` : '';
    const rx2 = p.secondRunes > 0 ? ` (and ${p.secondRunes} ${p.secondRunes === 1 ? 'rune' : 'runes'})` : '';

    const packHuntDesc = `Contribute ${p.firstContribution}+${p.secondContribution} to get back ${p.firstStandToGain}${r1} + ${p.secondStandToGain}${r2}`;
    const packHuntDescX = `Contribute ${p.firstContribution}+${p.secondContribution} to get back ${p.firstStandToGain + p.firstContribution - p.firstRunes * 15}${rx1} + ${p.secondStandToGain + p.secondContribution - p.secondRunes * 15}${rx2}`;
    const packHuntCopyText = `${opportunity.id} - ${opportunity.buildingName} - ${packHuntDescX}`;

    packHuntElement = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 0.5,
          p: 0.5,
          bgcolor: 'action.hover',
          borderRadius: 1,
          width: 'fit-content',
        }}
      >
        <Typography variant='caption' sx={{ color: 'text.primary', fontWeight: 500 }}>
          {packHuntDesc}
        </Typography>
        <Tooltip title='Copy pack hunt text'>
          <IconButton size='small' onClick={(e) => handleCopy(e, packHuntCopyText)} sx={{ p: 0.25 }}>
            <ContentCopyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // Common Secondary Text Component (Progress details + Pack Hunt details)
  const SecondaryText = (
    <Box>
      <Box sx={{ mt: 0.5, mb: 0.5, display: 'flex', alignItems: 'center' }}>
        <Button
          variant='outlined'
          size='small'
          onClick={(e) => handleVisitPlayer(e, opportunity)}
          sx={{
            textTransform: 'none',
            py: 0,
            px: 1,
            fontSize: '0.75rem',
            lineHeight: 1.5,
            minWidth: 'auto',
          }}
        >
          {opportunity.id}
        </Button>
        - {opportunity.guildName}
      </Box>
      <Typography variant='body2' color='text.secondary'>
        Page {opportunity.pageIndex} • Runes: {runeCount}
      </Typography>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
        Progress: {opportunity.investedKp} / {opportunity.totalKpNeeded} KP (
        {opportunity.totalKpNeeded - opportunity.investedKp} left)
      </Typography>
      {packHuntElement}
    </Box>
  );

  return (
    <>
      <ListItem
        alignItems='flex-start'
        disablePadding={!!onOpportunityClick}
        sx={{
          // Anchor the absolutely positioned clear button to the row itself
          position: 'relative',
          // Visually flag high-profit items using a stylish left highlight bar
          borderLeft: `4px solid ${isImportant ? theme.palette.warning.main : 'transparent'}`,
          transition: 'border-left-color 0.2s ease',
        }}
        secondaryAction={
          <Box
            // Added right margin to avoid overlap with absolute clear button
            sx={{
              display: 'flex',
              flexDirection: 'column', // Vertical Stack
              alignItems: 'flex-end', // Align Right
              gap: 0.5,
              mt: 1,
              mr: onClearOpportunity ? 4 : 0,
            }}
          >
            {/* Cost Chip (Blue) - First (Top) */}
            <Tooltip title='Required Contribution'>
              <Chip
                label={`${opportunity.contributeAtLeast} KP`}
                color='primary'
                size='small'
                icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ fontWeight: 'bold', width: '100%', justifyContent: 'flex-start' }}
              />
            </Tooltip>

            {/* Gain Chip (Green) - Second (Bottom) */}
            <Tooltip title='Net Gain (Runes Owned)'>
              <Chip
                label={`+${opportunity.standToGain} (${opportunity.numberOfRunes})`}
                color='success'
                size='small'
                icon={<TrendingUpIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ fontWeight: 'bold', width: '100%', justifyContent: 'flex-start' }}
              />
            </Tooltip>

            {/* Can Complete Chip (Purple) - Third (Bottom) */}
            {canCompleteProfitably && (
              <Tooltip title={`Profit if completed`}>
                <Chip
                  label={`+${profitIfCompleted}`}
                  color='secondary'
                  size='small'
                  icon={<VerifiedIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{ fontWeight: 'bold', width: '100%', justifyContent: 'flex-start' }}
                />
              </Tooltip>
            )}
          </Box>
        }
      >
        {/* Pinned to the row's own top-right corner, so it never moves with the content below it */}
        {onClearOpportunity && (
          <Tooltip title='Clear'>
            <IconButton
              size='small'
              sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onClearOpportunity(opportunity.id);
              }}
            >
              <ClearIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        )}

        {onOpportunityClick ? (
          <ListItemButton
            onClick={() => onOpportunityClick(opportunity.id)}
            alignItems='flex-start'
            sx={{
              '&:hover': { bgcolor: 'action.hover' },
              py: 1.5,
              pr: paddingRight, // Reduced padding due to vertical stack
            }}
          >
            <ListItemText primary={PrimaryText} secondary={SecondaryText} />
          </ListItemButton>
        ) : (
          <ListItemText primary={PrimaryText} secondary={SecondaryText} sx={{ py: 1.5, pr: paddingRight }} />
        )}
      </ListItem>
      {showDivider && <Divider component='li' variant='inset' />}
    </>
  );
};
