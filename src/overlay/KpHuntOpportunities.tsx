import React, { useMemo } from 'react';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import TrackChangesIcon from '@mui/icons-material/TrackChanges'; // "Hunt" icon

import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { KpHuntData } from '../model/kpHuntData';
import { KpHuntOpportunityItem } from './KpHuntOpportunityItem';
import { getOverlayStore } from './overlayStore';

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
  const store = getOverlayStore();
  const autoKpHunt = store((state) => state.autoKpHunt);
  const setAutoKpHunt = store((state) => state.setAutoKpHunt);
  const kpHuntImportantThreshold = store((state) => state.kpHuntImportantThreshold);
  const setKpHuntImportantThreshold = store((state) => state.setKpHuntImportantThreshold);

  // Convert Record to Array and Sort by standToGain (highest first)
  const sortedOpportunities = useMemo(() => {
    if (!kpHuntOpportunities) return [];

    return Object.entries(kpHuntOpportunities)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.standToGain - a.standToGain);
  }, [kpHuntOpportunities]);

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

  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
            <TrackChangesIcon />
          </Avatar>
        }
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {/* Compact Threshold input */}
            <Tooltip title='Highlight targets when they stand to gain at least this many KP' arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                <Typography variant='caption' sx={{ mr: 0.5, fontWeight: 700, color: 'text.secondary' }}>
                  Min Gain:
                </Typography>
                <input
                  type='number'
                  min='0'
                  value={kpHuntImportantThreshold ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setKpHuntImportantThreshold(isNaN(val) ? 0 : val);
                  }}
                  style={{
                    width: '42px',
                    height: '24px',
                    padding: '0 4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '4px',
                    backgroundColor: theme.palette.background.default,
                    color: theme.palette.text.primary,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </Box>
            </Tooltip>

            <Tooltip title='Toggle automatic KP Hunting when targets are scanned'>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!autoKpHunt}
                    onChange={(e) => setAutoKpHunt(e.target.checked)}
                    color='warning'
                    size='small'
                  />
                }
                label={
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    Auto
                  </Typography>
                }
                sx={{ m: 0, mr: 0.5 }}
              />
            </Tooltip>
            {hasData && onClearAllOpportunities && (
              <Tooltip title='Clear All'>
                <IconButton onClick={onClearAllOpportunities}>
                  <DeleteSweepIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
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
            {sortedOpportunities.map((opportunity, index) => (
              <KpHuntOpportunityItem
                key={opportunity.id}
                opportunity={opportunity}
                runeCount={cityResources?.[opportunity.resourceId] ?? 0}
                kpHuntImportantThreshold={kpHuntImportantThreshold}
                showDivider={index < sortedOpportunities.length - 1}
                onOpportunityClick={onOpportunityClick}
                onClearOpportunity={onClearOpportunity}
              />
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
