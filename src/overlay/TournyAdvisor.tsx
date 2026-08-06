import React, { useEffect, useMemo, useState } from 'react';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldMoonIcon from '@mui/icons-material/ShieldMoon';
import TimerIcon from '@mui/icons-material/Timer';
import { Alert, Box, Chip, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getBattleUnitTypes } from '../elvenar/getBattleUnitTypes';
import { ArmyDetails, TroopType } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { Army, TournyProvinceInformation } from '../model/tourny/provinceInformation';
import { TournyProvince } from '../model/tourny/provincesOverview';
import {
  calculateCounterComposition,
  CounterComposition,
  CounterQuality,
  parseUnitId,
  SQUAD_SLOTS,
} from './counterComposition';
import { getAccountId, getOverlayStore } from './overlayStore';
import { formatSeconds, TROOP_LABELS, UnitSprite } from './tournyUnitDisplay';

/** A province is done once it reaches level 6 and cannot be fought again this round. */
const COMPLETED_LEVEL = 6;

const QUALITY_COLORS: Record<CounterQuality, string> = {
  Optimal: 'success.main',
  Strong: 'primary.main',
  Decent: 'text.secondary',
  Meh: 'text.secondary',
  Experimental: 'text.disabled',
};

/** `magic_dust` reads as `Magic Dust`. */
const humanizeGood = (goodId: string) =>
  goodId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

interface ProvinceRow {
  province: TournyProvince;
  info: TournyProvinceInformation;
  enemyArmy: Army[];
  /** The best answer to this encounter, whether or not the player can field it today. */
  ideal: CounterComposition | null;
  /** The best answer stock allows, or null when that is the ideal one anyway. */
  fieldable: CounterComposition | null;
}

/** Identifies a composition by its unit types and their squad counts. */
const compositionKey = (composition: CounterComposition) =>
  composition.slots.map((slot) => `${slot.unit.unitTypeId}x${slot.squads}`).join('|');

/** An upgrading province cannot be fought until its timer runs out. */
const isUpgrading = (province: TournyProvince, now: number) =>
  !!province.upgradeTimeEnd && province.upgradeTimeEnd > now;

/**
 * Suggests what to field against every tournament province the player has opened on the map.
 *
 * Read-only throughout: the game is never driven from here, so the suggestion is free to name a
 * blend of unit types rather than the five identical squads an automated fight would need.
 */
export const TournyAdvisor = () => {
  const store = getOverlayStore();
  const tournyData = store((state) => state.tournyData);

  const [almanac, setAlmanac] = useState<BattleUnitType[]>([]);
  const [armyDetails, setArmyDetails] = useState<ArmyDetails | null>(null);
  const [tournamentRunning, setTournamentRunning] = useState(false);
  const [now, setNow] = useState(Date.now());

  const spriteUrl = chrome.runtime.getURL('military_sprite.png');

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    async function load() {
      const accountId = getAccountId();
      if (!accountId) return;

      await loadSingleAccountFromStorage(accountId);
      const accountData = getAccountById(accountId);

      setArmyDetails(accountData?.cityQuery?.armyDetails ?? null);
      // 'new' covers the window between a round being announced and the first fight.
      const tournaments = accountData?.cityQuery?.tournaments;
      setTournamentRunning(!!tournaments?.some((t) => t.state === 'running' || t.state === 'new'));

      try {
        setAlmanac(await getBattleUnitTypes());
      } catch (err) {
        console.error('Failed to load the battle unit almanac:', err);
      }
    }
    void load();
  }, [tournyData]);

  /** What the player can actually field, which is the roster the composition is drawn from. */
  const roster = useMemo(() => {
    if (!armyDetails) return [];
    const available = new Set<string>(armyDetails.availableUnitTypeIds);
    return almanac.filter((unit) => available.has(unit.unitTypeId));
  }, [almanac, armyDetails]);

  const unitStock = useMemo(() => {
    const stock: Record<string, number> = {};
    armyDetails?.unitSquads.forEach((squad) => {
      stock[squad.unitTypeId] = (stock[squad.unitTypeId] || 0) + squad.size;
    });
    return stock;
  }, [armyDetails]);

  // Deliberately free of `now`: the clock only decides ordering and whether the suggestion is
  // shown, so keeping it out stops every composition being recalculated once a second.
  const rows = useMemo<ProvinceRow[]>(() => {
    if (!tournyData || !roster.length) return [];

    return tournyData.provincesOverview.flatMap<ProvinceRow>((province) => {
      if (province.level === COMPLETED_LEVEL) return [];

      const info = tournyData.provinceInformation[`${province.r},${province.q}`];
      const enemyArmy = info?.encounters?.[0]?.enemyWaves?.[0]?.army;
      if (!info || !enemyArmy?.length) return [];

      // The ideal is computed without stock so it stays the thing worth training towards; the
      // second pass says what is fightable right now, and is dropped when the two agree.
      const ideal = calculateCounterComposition(enemyArmy, roster, almanac, info.playerSquadSize);
      const affordable = calculateCounterComposition(enemyArmy, roster, almanac, info.playerSquadSize, unitStock);
      const differs = !!ideal && !!affordable && compositionKey(ideal) !== compositionKey(affordable);

      return [{ province, info, enemyArmy, ideal, fieldable: differs ? affordable : null }];
    });
  }, [tournyData, roster, almanac, unitStock]);

  const orderedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          Number(isUpgrading(a.province, now)) - Number(isUpgrading(b.province, now)) ||
          a.province.number - b.province.number,
      ),
    [rows, now],
  );

  if (!tournamentRunning) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', opacity: 0.8 }}>
        <EventBusyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant='body1' color='text.secondary'>
          No active tournament.
        </Typography>
        <Typography variant='caption' color='text.disabled'>
          Check back when the next round begins!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {rows.length === 0 ? (
        <Alert severity='info' sx={{ mt: 2 }}>
          Open a province on the Tournament Map in game and its suggested composition will appear here.
        </Alert>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            pr: 1,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
          }}
        >
          <Stack spacing={1.5}>
            {orderedRows.map((row) => (
              <ProvinceCard
                key={`${row.province.r},${row.province.q}`}
                row={row}
                now={now}
                spriteUrl={spriteUrl}
                unitStock={unitStock}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

const ProvinceCard = ({
  row,
  now,
  spriteUrl,
  unitStock,
}: {
  row: ProvinceRow;
  now: number;
  spriteUrl: string;
  unitStock: Record<string, number>;
}) => {
  const { province, info, enemyArmy, ideal, fieldable } = row;
  const upgrading = isUpgrading(province, now);

  return (
    <Paper
      variant='outlined'
      sx={{
        p: 1.5,
        px: 2,
        borderLeft: '4px solid',
        borderLeftColor: upgrading ? 'warning.main' : 'primary.main',
        opacity: upgrading ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant='subtitle1' sx={{ fontWeight: 'bold' }}>
          Province {province.number}
          <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
            {humanizeGood(info.good_id)}
          </Typography>
        </Typography>

        {upgrading ? (
          <Chip
            icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
            label={formatSeconds(province.upgradeTimeEnd ? (province.upgradeTimeEnd - now) / 1000 : 0)}
            size='small'
            color='warning'
            variant='outlined'
            sx={{ fontWeight: 'bold' }}
          />
        ) : (
          <Typography variant='subtitle2' color='primary.main' sx={{ fontWeight: 'bold' }}>
            +{info.baseTournamentPointsAmount} TP
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 1.5, opacity: 0.3 }} />

      <SectionLabel icon={<SecurityIcon sx={{ fontSize: 14 }} />} text='Enemy lineup' />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
        {enemyArmy.map((enemy, index) => (
          <UnitChip key={index} unitTypeId={enemy.unitTypeId} spriteUrl={spriteUrl} />
        ))}
      </Box>

      {upgrading ? (
        <Typography variant='caption' color='text.disabled' sx={{ fontStyle: 'italic', mt: 1.5, display: 'block' }}>
          Upgrading — a new lineup will be drawn when it finishes.
        </Typography>
      ) : (
        ideal && (
          <>
            <CompositionView
              composition={ideal}
              enemyArmy={enemyArmy}
              spriteUrl={spriteUrl}
              label={fieldable ? 'Ideal composition' : 'Suggested composition'}
              unitStock={unitStock}
            />
            {fieldable && (
              <CompositionView
                composition={fieldable}
                enemyArmy={enemyArmy}
                spriteUrl={spriteUrl}
                label='Fightable now'
                caption='Train the units above for a stronger answer, or take this one and fight.'
              />
            )}
          </>
        )
      )}
    </Paper>
  );
};

/**
 * @param unitStock when given, every unit is annotated with what the player holds against what
 *   the composition asks for — which is the whole point of showing an unaffordable ideal.
 */
const CompositionView = ({
  composition,
  enemyArmy,
  spriteUrl,
  label,
  caption,
  unitStock,
}: {
  composition: CounterComposition;
  enemyArmy: Army[];
  spriteUrl: string;
  label: string;
  caption?: string;
  unitStock?: Record<string, number>;
}) => (
  <Box sx={{ mt: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
      <SectionLabel icon={<ShieldMoonIcon sx={{ fontSize: 14 }} />} text={label} />
      <Typography variant='caption' sx={{ fontWeight: 800, color: QUALITY_COLORS[composition.quality] }}>
        {composition.quality} · {composition.coverage}/{SQUAD_SLOTS} countered
        {composition.exposed > 0 && ` · ${composition.exposed} exposed`}
      </Typography>
    </Box>

    <Stack spacing={0.75}>
      {composition.slots.map((slot) => {
        const answeredClasses = [
          ...new Set(slot.answers.map((index) => parseUnitId(enemyArmy[index].unitTypeId)?.troopType)),
        ].filter((troopType): troopType is TroopType => !!troopType);

        const held = unitStock?.[slot.unit.unitTypeId] ?? 0;
        const short = !!unitStock && held < slot.totalUnits;

        return (
          <Box key={slot.unit.unitTypeId} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1,
                height: 30,
              }}
            >
              <Typography variant='caption' sx={{ fontWeight: 900, fontSize: '0.8rem' }}>
                {slot.squads}&times;
              </Typography>
              <UnitSprite troopType={slot.troopType} spriteUrl={spriteUrl} />
              <Typography variant='caption' sx={{ fontWeight: 700 }}>
                {slot.unit.name}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {slot.sizePerSquad.toLocaleString()} each
              </Typography>
            </Box>

            {answeredClasses.length > 0 && (
              <Typography variant='caption' color='text.secondary'>
                vs {answeredClasses.map((troopType) => TROOP_LABELS[troopType]).join(', ')}
              </Typography>
            )}

            {unitStock && (
              <Tooltip title={short ? `Train ${(slot.totalUnits - held).toLocaleString()} more` : 'You have enough'} arrow>
                <Typography
                  variant='caption'
                  color={short ? 'error.main' : 'text.secondary'}
                  sx={{ fontWeight: short ? 700 : 400 }}
                >
                  {held.toLocaleString()} / {slot.totalUnits.toLocaleString()}
                </Typography>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Stack>

    {caption && (
      <Typography variant='caption' color='text.disabled' sx={{ fontStyle: 'italic', mt: 1, display: 'block' }}>
        {caption}
      </Typography>
    )}
  </Box>
);

const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <Typography
    variant='caption'
    color='text.secondary'
    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold', textTransform: 'uppercase' }}
  >
    {icon} {text}
  </Typography>
);

const UnitChip = ({ unitTypeId, spriteUrl }: { unitTypeId: string; spriteUrl: string }) => {
  const parsed = parseUnitId(unitTypeId);
  if (!parsed) {
    return <Chip size='small' label={unitTypeId} variant='outlined' sx={{ height: 26 }} />;
  }

  return (
    <Tooltip title={TROOP_LABELS[parsed.troopType]} arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
          px: 0.75,
          height: 26,
        }}
      >
        <UnitSprite troopType={parsed.troopType} spriteUrl={spriteUrl} />
        <Typography variant='caption' sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
          {parsed.building.toUpperCase()}
        </Typography>
      </Box>
    </Tooltip>
  );
};
