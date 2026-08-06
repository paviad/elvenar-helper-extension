import React from 'react';
import ConstructionIcon from '@mui/icons-material/Construction';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';
import { Alert, Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { GUIDE_AUTHORS, TournamentGuide } from './tournamentGuide';
import { TournamentTips } from './TournamentTips';
import { BuildingSuggestions, ResolvedSuggestion } from './trainingSuggestions';
import {
  BUILDING_LABELS,
  formatSeconds,
  SectionLabel,
  TIER_COLORS,
  TierColor,
  TROOP_LABELS,
  UnitSprite,
} from './tournyUnitDisplay';

const TIER_BLURBS: Record<1 | 2 | 3, string> = {
  1: 'One dominant enemy class',
  2: 'Two dominant enemy classes — keep a varied stock',
  3: 'Three dominant enemy classes — keep a varied stock',
};

/**
 * Everything the guide has to say about one tournament: what it fields, what to train against it
 * and how to fight it. Used for the tournament being fought and the one coming up alike, which is
 * why the heading and the countdown are passed in rather than assumed.
 */
export const TournamentBriefing = ({
  guide,
  eyebrow,
  remainingSeconds,
  suggestionsByBuilding,
  spriteUrl,
}: {
  guide: TournamentGuide;
  eyebrow: string;
  /** Only the running tournament has a countdown. */
  remainingSeconds?: number;
  suggestionsByBuilding: BuildingSuggestions[];
  spriteUrl: string;
}) => {
  const accent = TIER_COLORS[guide.tier];

  return (
    <>
      <Paper variant='outlined' sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderLeft: '4px solid',
            borderLeftColor: `${accent}.main`,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette[accent].main, 0.14)}, ${alpha(
                theme.palette[accent].main,
                0.02,
              )})`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant='caption'
              sx={{ letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, color: `${accent}.dark` }}
            >
              {eyebrow}
            </Typography>
            {remainingSeconds !== undefined && (
              <Chip
                icon={<TimerIcon sx={{ fontSize: '13px !important' }} />}
                label={`${formatSeconds(remainingSeconds)} left`}
                size='small'
                variant='outlined'
                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant='h5' sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {guide.name}
            </Typography>
            <Chip
              label={`Tier ${guide.tier}`}
              size='small'
              color={accent}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
            />
          </Box>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.25 }}>
            {guide.difficulty ? `${guide.difficulty} · ${TIER_BLURBS[guide.tier]}` : TIER_BLURBS[guide.tier]}
          </Typography>
        </Box>

        <Box sx={{ px: 2, py: 1.5 }}>
          <SectionLabel icon={<SecurityIcon sx={{ fontSize: 14 }} />} text='What you will face' />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {guide.dominant.map((troopType) => (
              <Box
                key={troopType}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette[accent].main, 0.4),
                  bgcolor: (theme) => alpha(theme.palette[accent].main, 0.07),
                  borderRadius: 1,
                  px: 1,
                  height: 32,
                }}
              >
                <UnitSprite troopType={troopType} spriteUrl={spriteUrl} />
                <Typography variant='caption' sx={{ fontWeight: 700 }}>
                  {TROOP_LABELS[troopType]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      <Paper variant='outlined' sx={{ p: 1.5, px: 2, mt: 1.5 }}>
        <SectionLabel icon={<ConstructionIcon sx={{ fontSize: 14 }} />} text='What to train' />
        {suggestionsByBuilding.length === 0 ? (
          <Alert severity='info' sx={{ mt: 1 }}>
            Open the game so your army details load, and the suggestions will name your own units.
          </Alert>
        ) : (
          <Stack spacing={1.75} sx={{ mt: 1.25 }}>
            {suggestionsByBuilding.map(({ building, suggestions }) => (
              <Box key={building}>
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    pl: 1,
                    borderLeft: '3px solid',
                    borderLeftColor: `${accent}.light`,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {BUILDING_LABELS[building]}
                </Typography>
                <Stack spacing={0.5}>
                  {suggestions.map((suggestion) => (
                    <SuggestionRow
                      key={`${suggestion.building}-${suggestion.troopType}`}
                      suggestion={suggestion}
                      spriteUrl={spriteUrl}
                      accent={accent}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <TournamentTips guide={guide} sx={{ mt: 1.5 }} />

      <Typography
        variant='caption'
        color='text.disabled'
        sx={{ display: 'block', mt: 1, mb: 1, px: 0.5, fontSize: '0.65rem', lineHeight: 1.5 }}
      >
        Tournament guide by{' '}
        {GUIDE_AUTHORS.map((author, index) => (
          <React.Fragment key={author.name}>
            {index > 0 && ' · '}
            <Box component='span' sx={{ fontWeight: 600 }}>
              {author.name}
            </Box>{' '}
            ({author.world})
          </React.Fragment>
        ))}
      </Typography>
    </>
  );
};

const SuggestionRow = ({
  suggestion,
  spriteUrl,
  accent,
}: {
  suggestion: ResolvedSuggestion;
  spriteUrl: string;
  accent: TierColor;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1,
      py: 0.5,
      borderRadius: 1,
      border: '1px solid',
      borderColor: suggestion.primary ? (theme) => alpha(theme.palette[accent].main, 0.35) : 'transparent',
      bgcolor: suggestion.primary ? (theme) => alpha(theme.palette[accent].main, 0.06) : 'transparent',
      opacity: suggestion.unit ? 1 : 0.55,
    }}
  >
    <UnitSprite troopType={suggestion.troopType} spriteUrl={spriteUrl} />

    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
      <Typography
        variant='caption'
        sx={{ display: 'block', fontWeight: suggestion.primary ? 700 : 500, lineHeight: 1.3 }}
      >
        {suggestion.unit?.name ?? TROOP_LABELS[suggestion.troopType]}
      </Typography>
      <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.6rem' }}>
        {TROOP_LABELS[suggestion.troopType]}
        {!suggestion.primary && ' · alternate'}
      </Typography>
    </Box>

    {suggestion.unit ? (
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        <strong>{suggestion.held.toLocaleString()}</strong> in stock
      </Typography>
    ) : (
      <Tooltip title='Not unlocked yet' arrow>
        <Typography variant='caption' color='text.disabled' sx={{ whiteSpace: 'nowrap' }}>
          locked
        </Typography>
      </Tooltip>
    )}
  </Box>
);
