import React, { useMemo } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Icon for copy
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FavoriteIcon from '@mui/icons-material/Favorite'; // Icon for favorite
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import TrackChangesIcon from '@mui/icons-material/TrackChanges'; // "Hunt" icon

import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Icon for gain
import VerifiedIcon from '@mui/icons-material/Verified'; // Icon for completion
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { KpHuntData } from '../model/kpHuntData';

interface KpHuntOpportunitiesProps {
  kpHuntOpportunities?: Record<string, KpHuntData>;
  cityResources?: Record<string, number>;
  kpInstantsInventory?: Record<number, number>;
  onOpportunityClick?: (id: string) => void; // Optional handler if you want interaction
  onClearOpportunity?: (id: string) => void;
  onClearAllOpportunities?: () => void;
}

export const KpHuntOpportunities: React.FC<KpHuntOpportunitiesProps> = ({
  kpHuntOpportunities,
  onOpportunityClick,
  onClearOpportunity,
  onClearAllOpportunities,
  cityResources,
  kpInstantsInventory,
}) => {
  const theme = useTheme();

  // Convert Record to Array and Sort by standToGain (highest first)
  const sortedOpportunities = useMemo(() => {
    if (!kpHuntOpportunities) return [];

    return Object.entries(kpHuntOpportunities)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.standToGain - a.standToGain);
  }, [kpHuntOpportunities, cityResources]);

  // Format inventory string: "Have: 5x20, 10x10... (Total: 200)"
  const inventorySubheader = useMemo(() => {
    if (!kpInstantsInventory) return `${sortedOpportunities.length} active targets found`;

    let totalKp = 0;
    const parts = Object.entries(kpInstantsInventory)
      .map(([val, count]) => {
        const kpVal = parseInt(val, 10);
        totalKp += kpVal * count;
        return { val: kpVal, count };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.val - a.val) // Sort by KP value descending (biggest packs first)
      .map((item) => `${item.count}x${item.val}`);

    if (parts.length === 0) return 'Have: None';
    return `Have: ${parts.join(', ')} (Total: ${totalKp})`;
  }, [kpInstantsInventory, sortedOpportunities.length]);

  const hasData = sortedOpportunities.length > 0;

  // Handler for copying summary text to clipboard securely
  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Prevent row click

    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Unable to copy', err);
    });
  };

  // Adjust padding right to accommodate the secondary actions (Vertical Chips)
  const paddingRight = 14;

  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
            <TrackChangesIcon />
          </Avatar>
        }
        action={
          hasData && onClearAllOpportunities ? (
            <Tooltip title='Clear All'>
              <IconButton onClick={onClearAllOpportunities}>
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>
          ) : null
        }
        title={
          <Typography variant='h6' component='div' sx={{ fontWeight: 'bold' }}>
            KP Hunt Opportunities
          </Typography>
        }
        subheader={inventorySubheader}
        sx={{ pb: 1 }}
      />
      <Divider />

      <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {!hasData ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: 'text.secondary',
              gap: 1,
            }}
          >
            <SentimentDissatisfiedIcon fontSize='large' />
            <Typography variant='body1'>No opportunities found right now.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {sortedOpportunities.map((opportunity, index) => {
              const runeCount = cityResources?.[opportunity.resourceId] ?? 0;

              // Calculate if profitable to complete
              const contributeToComplete = opportunity.totalKpNeeded - opportunity.investedKp;
              const extraContributionBeyondMinimal = contributeToComplete - opportunity.contributeAtLeast;
              const profitIfCompleted = opportunity.standToGain - extraContributionBeyondMinimal;
              const canCompleteProfitably = profitIfCompleted > 0;

              // Primary Summary string for clipboard
              const totalGetBack =
                opportunity.standToGain + opportunity.contributeAtLeast - opportunity.numberOfRunes * 15;
              const primaryRunesText =
                opportunity.numberOfRunes > 0
                  ? ` plus ${opportunity.numberOfRunes} ${opportunity.numberOfRunes === 1 ? 'rune' : 'runes'}`
                  : '';
              const primarySummaryText = `${opportunity.id} - ${opportunity.buildingName} - invest ${opportunity.contributeAtLeast} to get back a total of ${totalGetBack}${primaryRunesText}`;

              // Common Primary Text Component (Name + heart + copy)
              const PrimaryText = (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 500 }} color='text.primary'>
                    {opportunity.buildingName}
                  </Typography>
                  {opportunity.isFavorite && (
                    <Tooltip title='Favorite Player'>
                      <FavoriteIcon sx={{ fontSize: 16, color: '#f44336' }} />
                    </Tooltip>
                  )}
                  <Tooltip title='Copy summary to clipboard'>
                    <IconButton
                      size='small'
                      onClick={(e) => handleCopy(e, primarySummaryText)}
                      sx={{ p: 0.5, ml: 0.5 }}
                    >
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
                const rx2 =
                  p.secondRunes > 0 ? ` (and ${p.secondRunes} ${p.secondRunes === 1 ? 'rune' : 'runes'})` : '';

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
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    {opportunity.id}
                  </Typography>
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
                <React.Fragment key={opportunity.id}>
                  <ListItem
                    alignItems='flex-start'
                    disablePadding={!!onOpportunityClick}
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
                        {onClearOpportunity && (
                          <Tooltip title='Clear'>
                            <IconButton
                              size='small'
                              edge='end'
                              sx={{ position: 'absolute', top: -8, right: -8 }} // Absolute position for X button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearOpportunity(opportunity.id);
                              }}
                            >
                              <ClearIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}

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
                      <ListItemText
                        primary={PrimaryText}
                        secondary={SecondaryText}
                        sx={{ py: 1.5, pr: paddingRight }}
                      />
                    )}
                  </ListItem>
                  {index < sortedOpportunities.length - 1 && <Divider component='li' variant='inset' />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
