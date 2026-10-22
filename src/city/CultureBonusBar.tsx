import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { CultureBonus, getCultureBonusLevel } from '../model/cultureBonus';
import { CultureHelp } from './calculateCultureHelp';

const FILL = '#ffb300';

/**
 * How far the city's spare culture reaches up its culture bonus ladder: a bar notched at each
 * level's threshold, filled to where the city stands. The numbers live in the tooltip.
 * `plannedHelp` is given for a ladder worked out for a plan rather than sent by the game.
 */
export const CultureBonusBar = ({
  bonus,
  availableCulture,
  plannedHelp,
}: {
  bonus: CultureBonus;
  availableCulture: number;
  plannedHelp?: CultureHelp;
}) => {
  const level = getCultureBonusLevel(bonus, availableCulture);
  const culture = availableCulture + bonus.neighbourlyHelpBonus;
  const top = bonus.thresholds[bonus.thresholds.length - 1] || 1;
  // Some room past the last notch, so it reads as a notch rather than the bar's end.
  const scale = top * 1.08;
  const toPercent = (value: number) => Math.min(Math.max(value / scale, 0), 1) * 100;

  const tooltip = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant='caption' component='div' sx={{ fontWeight: 'bold' }}>
        Culture bonus: {level.percentage.toLocaleString()}% (level {level.level})
      </Typography>
      <Box component='table' sx={{ borderSpacing: '12px 0', mx: '-12px', my: 0.5, fontSize: 12 }}>
        <tbody>
          {bonus.thresholds.map((threshold, i) => (
            <Box component='tr' key={i} sx={{ fontWeight: i === level.level ? 'bold' : undefined }}>
              <td>Level {i}</td>
              <Box component='td' sx={{ textAlign: 'right' }}>
                {threshold.toLocaleString()}
              </Box>
              <Box component='td' sx={{ textAlign: 'right' }}>
                {(bonus.percentages[i] ?? 100).toLocaleString()}%
              </Box>
            </Box>
          ))}
        </tbody>
      </Box>
      <Typography variant='caption' component='div'>
        Available culture: {availableCulture.toLocaleString()}
      </Typography>
      <Typography variant='caption' component='div'>
        Neighborly help bonus: {bonus.neighbourlyHelpBonus.toLocaleString()}
      </Typography>
      {plannedHelp && (
        <Typography variant='caption' component='div' sx={{ fontStyle: 'italic' }}>
          Planned: {plannedHelp.helped} of {plannedHelp.helpable} culture buildings helped, {plannedHelp.enchanted}{' '}
          enchanted
        </Typography>
      )}
      <Typography variant='caption' component='div'>
        {level.neededForNext === undefined
          ? 'Top level reached'
          : `Needed for next level: ${level.neededForNext.toLocaleString()}`}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement='left'>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          Bonus
        </Typography>
        <Box sx={{ position: 'relative', flexGrow: 1, height: 8, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              width: `${toPercent(culture)}%`,
              borderRadius: 1,
              bgcolor: FILL,
            }}
          />
          {bonus.thresholds.slice(1).map((threshold, i) => {
            // Reached notches stand taller and lit, so a level just crossed is plain to see.
            const reached = i + 1 <= level.level;
            return (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: reached ? -4 : -2,
                  bottom: reached ? -4 : -2,
                  left: `${toPercent(threshold)}%`,
                  width: reached ? 3 : 2,
                  ml: reached ? '-1.5px' : '-1px',
                  borderRadius: 1,
                  bgcolor: reached ? 'success.main' : 'text.disabled',
                }}
              />
            );
          })}
        </Box>
      </Stack>
    </Tooltip>
  );
};
