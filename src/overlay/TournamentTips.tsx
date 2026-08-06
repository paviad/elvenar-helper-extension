import React from 'react';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { Box, Paper, Typography } from '@mui/material';
import { TournamentGuide } from './tournamentGuide';
import { SectionLabel, TIER_COLORS } from './tournyUnitDisplay';

/**
 * The guide's advice for one tournament. Shared by the prep tab, which shows it for the tournament
 * coming up, and the counters tab, which shows it for the one being fought right now.
 */
export const TournamentTips = ({
  guide,
  label = 'Battle tips',
  sx,
}: {
  guide: TournamentGuide;
  label?: string;
  sx?: React.ComponentProps<typeof Paper>['sx'];
}) => {
  const accent = TIER_COLORS[guide.tier];

  return (
    <Paper variant='outlined' sx={{ p: 1.5, px: 2, ...sx }}>
      <SectionLabel icon={<LightbulbOutlinedIcon sx={{ fontSize: 14 }} />} text={label} />
      {/* Markers are drawn rather than left to `list-style`, which the host page's own list and
          text rules would otherwise get a say in. */}
      <Box component='ul' sx={{ listStyle: 'none', m: 0, mt: 1.25, p: 0, display: 'grid', gap: 1 }}>
        {guide.tips.map((tip, index) => (
          <Box component='li' key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box
              sx={{ mt: '6px', width: 5, height: 5, borderRadius: '50%', bgcolor: `${accent}.main`, flexShrink: 0 }}
            />
            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.55 }}>
              {tip}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
