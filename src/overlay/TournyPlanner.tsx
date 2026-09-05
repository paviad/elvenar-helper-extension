import React, { useEffect, useMemo, useRef, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getBattleUnitTypes } from '../elvenar/getBattleUnitTypes';
import { relayToGame } from '../inject/relayToGame';
import { ArmyDetails, TrainingBuilding, TroopType, UnitType } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { TournyProvince } from '../model/tourny/provincesOverview';
import { TournyFight } from '../model/tourny/tournyFight';
import { calculateBestCounter, CounterQuality, CounterResult, StrengthModifier } from './counterCalculation';
import { getAccountId, getOverlayStore } from './overlayStore';
import { TournyData } from './tournyData';

/**
 * ============================================================================
 * MILITARY UI UTILITIES
 * ============================================================================
 */

const getUnitSpriteIndex = (unitId: UnitType | TroopType): number => {
  const lower = unitId.toLowerCase();
  if (lower.includes('lm') || lower.includes('_lm_')) return 0;
  if (lower.includes('hr') || lower.includes('_hr_')) return 1;
  if (lower.includes('hm') || lower.includes('_hm_')) return 2;
  if (lower.includes('ma') || lower.includes('_ma_')) return 3;
  if (lower.includes('lr') || lower.includes('_lr_')) return 4;
  return -1;
};

const formatBuildingName = (unitId: UnitType): string => {
  const lower = unitId.toLowerCase();
  if (lower.includes('hb') || lower.match(/mob_hb/)) return 'HB';
  if (lower.includes('eb') || lower.match(/mob_eb/)) return 'EB';
  if (lower.includes('mc') || lower.match(/mob_mc/)) return 'MC';
  if (lower.includes('tg') || lower.match(/mob_tg/)) return 'TG';
  return 'Unit';
};

const formatUnitName = (unitId: UnitType): string => {
  const lower = unitId.toLowerCase();
  if (lower.includes('lm') || lower.includes('_lm_')) return 'Light Melee';
  if (lower.includes('lr') || lower.includes('_lr_')) return 'Light Ranged';
  if (lower.includes('ma') || lower.includes('_ma_')) return 'Mage';
  if (lower.includes('hm') || lower.includes('_hm_')) return 'Heavy Melee';
  if (lower.includes('hr') || lower.includes('_hr_')) return 'Heavy Ranged';
  return unitId.replace('mob_', '').replace(/_/g, ' ');
};

const getQualityColor = (quality: CounterQuality) => {
  switch (quality) {
    case 'Optimal':
      return 'success.main';
    case 'Strong':
      return 'primary.main';
    case 'Decent':
      return 'text.secondary';
    case 'Meh':
      return 'text.secondary';
    default:
      return 'text.disabled';
  }
};

const formatSeconds = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

/** How long an action button stays disabled after a click, to swallow accidental double clicks. */
const CLICK_COOLDOWN_MS = 2000;

type ProvinceAction = 'fight' | 'cater' | 'open';

/**
 * Fixed so that the lone open button can be given the width of the fight/cater pair it replaces.
 * Wide enough for FIGHT and CATER at this size and weight without the chip ellipsising them.
 */
const ACTION_CHIP_WIDTH = 60;
/** The `spacing={0.5}` between the fight and cater buttons, in pixels. */
const ACTION_CHIP_GAP = 4;

const actionChipSx = {
  height: 42,
  width: ACTION_CHIP_WIDTH,
  fontSize: '0.65rem',
  fontWeight: 900,
  borderRadius: 0.5,
};

const provinceCoordKey = (province: TournyProvince) => `${province.q},${province.r}`;

const cooldownKey = (province: TournyProvince, action: ProvinceAction) => `${provinceCoordKey(province)}:${action}`;

/**
 * Fighting and catering are two ways to settle the same encounter, so once one of them has been
 * asked for the other is only ever a mistake. This records which one was asked for, against the
 * level it was asked at - completing an encounter raises the level, and the next one is a fresh
 * choice, so the level is what releases the lock without needing to hear back from the game.
 */
type TakenAction = { action: 'fight' | 'cater'; level: number | undefined };

/**
 * Roughly the width at which a typical wave and the recommendation both fit on one line spelled
 * out - the small panel preset leaves the card about 320px, well under it. Below this the wordier
 * half of each label is dropped and left to the tooltips. Asked of the card rather than of the
 * viewport because the panel is resizable, so the same card is both wide and narrow in a session.
 */
const WIDE_CARD = '@container (min-width: 440px)';

type ExtendedProvince = TournyProvince & {
  bestCounter?: CounterResult | null;
  squadSize?: number;
  neededUnitsForOneSquad?: number;
  availableUnitsOfType?: number;
};

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 */
export const TournyPlanner = () => {
  const store = getOverlayStore();
  const tournyData: TournyData | undefined = store((state) => state.tournyData);

  // Zustand Modifiers State
  const modifiers = store((state) => state.modifiers) || [];
  const setModifiers = store((state) => state.setModifiers);

  const [unitAlmanac, setUnitAlmanac] = useState<BattleUnitType[]>([]);
  const [availableRoster, setAvailableRoster] = useState<BattleUnitType[]>([]);
  const [runningTourny, setRunningTourny] = useState<boolean>(false);
  const [armyDetails, setArmyDetails] = useState<ArmyDetails | null>(null);

  const spriteUrl = chrome.runtime.getURL('military_sprite.png');

  const [now, setNow] = useState(() => Date.now());

  // Priority UI Control State
  const [modBuilding, setModBuilding] = useState<TrainingBuilding | 'any'>('any');
  const [modTroop, setModTroop] = useState<TroopType | 'any'>('any');
  const [modFactor, setModFactor] = useState<number | string>(1.5);

  // Keys of action buttons that are temporarily disabled after being clicked.
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const cooldownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Provinces that have already been fought or catered, by coordinate.
  const [takenActions, setTakenActions] = useState<Record<string, TakenAction>>({});

  useEffect(() => {
    // Refresh the component every second to update the "time left" counters automatically
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => cooldownTimers.current.forEach(clearTimeout), []);

  const startCooldown = (key: string) => {
    setCooldowns((prev) => ({ ...prev, [key]: true }));
    const timer = setTimeout(() => {
      setCooldowns((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      cooldownTimers.current = cooldownTimers.current.filter((t) => t !== timer);
    }, CLICK_COOLDOWN_MS);
    cooldownTimers.current.push(timer);
  };

  useEffect(() => {
    // The game pushes tournament updates in bursts, so this can be restarted while an
    // earlier run is still awaiting storage or the almanac. Without the guard the two
    // race and whichever finishes last wins, which is not necessarily the newer one.
    let cancelled = false;

    async function fetchData() {
      const accountId = getAccountId();
      if (!accountId) return;
      await loadSingleAccountFromStorage(accountId);
      if (cancelled) return;

      const accountData = getAccountById(accountId);
      const armyDetails = accountData?.cityQuery?.armyDetails;
      if (!armyDetails) return;
      setArmyDetails(armyDetails);

      const numberOfUnitsByType: Record<string, number> = {};
      armyDetails.unitSquads.forEach((squad) => {
        numberOfUnitsByType[squad.unitTypeId] = (numberOfUnitsByType[squad.unitTypeId] || 0) + squad.size;
      });
      console.log('Army details updated. Units by type:', numberOfUnitsByType);

      const tournamentInfo = accountData?.cityQuery?.tournaments;
      // If no tournament info exists or there is some in 'coming' state, we consider the tournament not running
      const isRunning = tournamentInfo && tournamentInfo.some((r) => r.state === 'running' || r.state === 'new');
      setRunningTourny(!!isRunning);

      try {
        const almanac = await getBattleUnitTypes();
        if (cancelled) return;
        setUnitAlmanac(almanac);
        const availableUnitTypeIds = armyDetails.availableUnitTypeIds as UnitType[];
        const rosterUnits = almanac.filter((unit) => availableUnitTypeIds.includes(unit.unitTypeId));
        setAvailableRoster(rosterUnits);
      } catch (err) {
        console.error('Failed to load unit types:', err);
      }
    }
    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [tournyData]);

  const sortedProvinces: ExtendedProvince[] = useMemo(() => {
    // If the tournament isn't running, clear the list immediately
    if (
      !runningTourny ||
      !tournyData?.provincesOverview ||
      !availableRoster.length ||
      !unitAlmanac.length ||
      !armyDetails
    ) {
      return [];
    }

    const sorted = [...tournyData.provincesOverview].sort((a, b) => {
      const getWeight = (p: TournyProvince) => {
        if (p.level === 6) return 2;
        if (p.upgradeTime && p.upgradeTime > 0) return 1;
        return 0;
      };

      const weightA = getWeight(a);
      const weightB = getWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return a.number - b.number;
    });

    const withCounter = sorted.map((province) => {
      const isCompleted = province.level === 6;
      const isUpgrading = !isCompleted && province.upgradeTimeEnd && province.upgradeTimeEnd > now;
      const provinceKey = `${province.r},${province.q}`;
      const provinceInfo = tournyData.provinceInformation[provinceKey];
      if (!provinceInfo) {
        return province;
      }

      const enemyArmy = provinceInfo.encounters?.[0].enemyWaves?.[0]?.army;
      if (!enemyArmy) {
        return province;
      }

      const squadSize = provinceInfo.playerSquadSize;
      let bestCounter: CounterResult | null = null;
      let neededUnitsForOneSquad: number | undefined;
      let availableUnitsOfType: number | undefined;

      if (!isCompleted && !isUpgrading) {
        // Pass the new modifiers array into the counter calculator
        bestCounter = calculateBestCounter(enemyArmy, availableRoster, unitAlmanac, modifiers);

        if (bestCounter) {
          const unitTypeId = bestCounter.unit.unitTypeId;
          const unitFromAlmanac = unitAlmanac.find((u) => u.unitTypeId === unitTypeId);
          if (unitFromAlmanac) {
            const unitWeight = unitFromAlmanac.unitWeight;
            // The game rounds UP (ArmyModel.getSquadUnits); floor would field short squads.
            const size = Math.ceil(squadSize / unitWeight);
            neededUnitsForOneSquad = size;
            availableUnitsOfType =
              armyDetails?.unitSquads.filter((s) => s.unitTypeId === unitTypeId).reduce((sum, s) => sum + s.size, 0) ||
              0;
          }
        }
      }

      return {
        ...province,
        bestCounter,
        squadSize,
        neededUnitsForOneSquad,
        availableUnitsOfType,
      } satisfies ExtendedProvince;
    });

    return withCounter;
    // `now` is read to skip provinces still upgrading, but is deliberately not a dependency:
    // it ticks every second and this recomputes a counter for every open province, so
    // listing it would redo the whole analysis once a second. A province finishing its
    // upgrade is something the game reports, which lands in tournyData and refreshes this
    // anyway, so the snapshot cannot stay stale for long.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournyData, runningTourny, availableRoster, unitAlmanac, armyDetails, modifiers]);

  /** The action already taken on this province, or undefined once the province has moved on. */
  const takenAction = (province: ExtendedProvince): TakenAction['action'] | undefined => {
    const taken = takenActions[provinceCoordKey(province)];
    return taken && taken.level === province.level ? taken.action : undefined;
  };

  const markActionTaken = (province: ExtendedProvince, action: TakenAction['action']) =>
    setTakenActions((prev) => ({ ...prev, [provinceCoordKey(province)]: { action, level: province.level } }));

  const isProvinceOpen = (province: ExtendedProvince): boolean => {
    if (province.level === 6) return false;
    if (province.upgradeTimeEnd && province.upgradeTimeEnd > now) return false;
    const provinceKey = `${province.r},${province.q}`;
    const provinceInfo = tournyData?.provinceInformation[provinceKey];
    if (!provinceInfo) return false;
    const enemyArmy = provinceInfo.encounters?.[0].enemyWaves?.[0]?.army;
    if (!enemyArmy) return false;
    return true;
  };

  const handleFightClick = (province: ExtendedProvince) => () => {
    const key = cooldownKey(province, 'fight');
    if (cooldowns[key]) return;

    const bestCounter = province.bestCounter;
    if (!bestCounter || province.neededUnitsForOneSquad === undefined) return;

    const unitTypeId = bestCounter.unit.unitTypeId;
    const size = province.neededUnitsForOneSquad;
    const unit = {
      __class__: 'UnitSquadVO' as const,
      unitTypeId,
      size,
    };

    console.log('Posting message for fight click with payload:', { q: province.q, r: province.r, unit });

    startCooldown(key);
    markActionTaken(province, 'fight');
    relayToGame('tournyFight', { q: province.q, r: province.r, unit } satisfies TournyFight);
  };

  const handleCaterClick = (province: ExtendedProvince) => () => {
    const key = cooldownKey(province, 'cater');
    if (cooldowns[key]) return;
    startCooldown(key);
    markActionTaken(province, 'cater');
    relayToGame('tournyCater', { q: province.q, r: province.r });
  };

  const handleOpenClick = (province: ExtendedProvince) => () => {
    const key = cooldownKey(province, 'open');
    if (cooldowns[key]) return;
    startCooldown(key);
    relayToGame('tournyOpen', { q: province.q, r: province.r });
  };

  const handleAddModifier = () => {
    const factorNum = typeof modFactor === 'string' ? parseFloat(modFactor) : modFactor;
    if (isNaN(factorNum) || (modBuilding === 'any' && modTroop === 'any')) return;

    const newModifier: StrengthModifier = {
      factor: factorNum,
      building: modBuilding === 'any' ? undefined : modBuilding,
      troopType: modTroop === 'any' ? undefined : modTroop,
    };

    if (setModifiers) {
      setModifiers([...modifiers, newModifier]);
    }

    handleClearForm();
  };

  const handleRemoveModifier = (index: number) => {
    const modToRemove = modifiers[index];

    // Repopulate form inputs with the removed modifier's details
    setModBuilding(modToRemove.building || 'any');
    setModTroop(modToRemove.troopType || 'any');
    setModFactor(modToRemove.factor);

    // Remove from the store
    if (setModifiers) {
      setModifiers(modifiers.filter((_, i) => i !== index));
    }
  };

  const handleClearForm = () => {
    setModBuilding('any');
    setModTroop('any');
    setModFactor(1.5);
  };

  const isFormDirty = modBuilding !== 'any' || modTroop !== 'any' || Number(modFactor) !== 1.5;

  return (
    // Padding, background and the heading all come from the Tourny shell that hosts this tab.
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* COMPACT MODIFIER CONTROL UI */}
      <Paper
        variant='outlined'
        sx={{ mb: 2, p: 1, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.paper' }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 'bold', mr: 1 }}>
            Prioritize:
          </Typography>

          <TextField
            select
            size='small'
            label='Building'
            value={modBuilding}
            onChange={(e) => setModBuilding(e.target.value as TrainingBuilding | 'any')}
            sx={{ minWidth: 100 }}
            slotProps={{
              select: {
                MenuProps: {
                  disablePortal: true,
                },
              },
            }}
          >
            <MenuItem value='any'>Any</MenuItem>
            <MenuItem value='hb'>HB</MenuItem>
            <MenuItem value='eb'>EB</MenuItem>
            <MenuItem value='mc'>MC</MenuItem>
            <MenuItem value='tg'>TG</MenuItem>
          </TextField>

          <TextField
            select
            size='small'
            label='Troop'
            value={modTroop}
            onChange={(e) => setModTroop(e.target.value as TroopType | 'any')}
            sx={{ minWidth: 100 }}
            slotProps={{
              select: {
                MenuProps: {
                  disablePortal: true,
                },
              },
            }}
          >
            <MenuItem value='any'>Any</MenuItem>
            <MenuItem value='lm'>Light Melee</MenuItem>
            <MenuItem value='lr'>Light Ranged</MenuItem>
            <MenuItem value='ma'>Mage</MenuItem>
            <MenuItem value='hm'>Heavy Melee</MenuItem>
            <MenuItem value='hr'>Heavy Ranged</MenuItem>
          </TextField>

          <TextField
            label='Factor (x)'
            type='number'
            size='small'
            sx={{ width: 85 }}
            value={modFactor}
            onChange={(e) => setModFactor(e.target.value)}
            slotProps={{
              htmlInput: { step: 0.1, min: 0.1 },
            }}
          />

          <Button
            variant='contained'
            size='small'
            onClick={handleAddModifier}
            disabled={modBuilding === 'any' && modTroop === 'any'}
            sx={{ height: '38px' }}
          >
            Add
          </Button>

          {isFormDirty && (
            <Tooltip title='Clear inputs'>
              <IconButton size='small' onClick={handleClearForm} sx={{ color: 'text.secondary' }}>
                <ClearIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {modifiers.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {modifiers.map((mod, idx) => {
              const bLabel = mod.building ? mod.building.toUpperCase() : 'Any Bldg';
              return (
                <Chip
                  key={idx}
                  size='small'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {mod.troopType ? (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundImage: `url(${spriteUrl})`,
                            backgroundPosition: `-${getUnitSpriteIndex(mod.troopType) * 22}px 0px`,
                            backgroundSize: '110px 22px',
                            imageRendering: 'pixelated',
                          }}
                        />
                      ) : (
                        <span>Any Troop</span>
                      )}
                      <span>{bLabel}</span>
                      <span>(x{mod.factor})</span>
                    </Box>
                  }
                  onDelete={() => handleRemoveModifier(idx)}
                  color='primary'
                  variant='outlined'
                  sx={{
                    fontWeight: 'bold',
                    '& .MuiChip-label': { display: 'flex', alignItems: 'center' },
                  }}
                />
              );
            })}
          </Box>
        )}
      </Paper>

      {!runningTourny ? (
        <Box sx={{ mt: 4, textAlign: 'center', opacity: 0.8 }}>
          <EventBusyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant='body1' color='text.secondary'>
            No active tournament.
          </Typography>
          <Typography variant='caption' color='text.disabled'>
            Check back when the next round begins!
          </Typography>
        </Box>
      ) : tournyData ? (
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
            {sortedProvinces.map((province) => {
              const isCompleted = province.level === 6;
              const isUpgrading = !isCompleted && province.upgradeTimeEnd && province.upgradeTimeEnd > now;

              const provinceInfo =
                !isCompleted && !isUpgrading
                  ? Object.values(tournyData.provinceInformation || {}).find(
                      (info) => info.q === province.q && info.r === province.r,
                    )
                  : null;

              const enemyArmy = provinceInfo?.encounters?.[0]?.enemyWaves?.[0]?.army || [];
              const bestCounter = province.bestCounter;
              const taken = takenAction(province);

              return (
                <Paper
                  key={province.number}
                  variant='outlined'
                  sx={{
                    p: 1.5,
                    px: 2,
                    bgcolor: isCompleted ? 'action.hover' : 'background.paper',
                    borderLeft: '4px solid',
                    borderLeftColor: isCompleted ? 'text.disabled' : isUpgrading ? 'warning.main' : 'primary.main',
                    opacity: isCompleted ? 0.6 : 1,
                    filter: isCompleted ? 'grayscale(0.8)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                    // So the enemy/recommendation row can answer to the card's width, which follows
                    // the resizable panel, rather than to the viewport.
                    containerType: 'inline-size',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant={isCompleted ? 'caption' : 'subtitle1'}
                      sx={{ fontWeight: isCompleted ? 'medium' : 'bold' }}
                    >
                      Province {province.number}
                      {isCompleted && (
                        <Typography
                          component='span'
                          variant='caption'
                          sx={{ ml: 1, fontStyle: 'italic', opacity: 0.7 }}
                        >
                          (Completed)
                        </Typography>
                      )}
                    </Typography>

                    {isUpgrading && (
                      <Chip
                        icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
                        label={formatSeconds(province.upgradeTimeEnd ? (province.upgradeTimeEnd - now) / 1000 : 0)}
                        size='small'
                        color='warning'
                        variant='outlined'
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}

                    {!isCompleted && !isUpgrading && (
                      <Typography variant='subtitle2' color='primary.main' sx={{ fontWeight: 'bold' }}>
                        +{province.baseTournamentPointsAmount} TP
                      </Typography>
                    )}
                  </Box>

                  {!isCompleted && !isUpgrading && (
                    <Box sx={{ mt: 1 }}>
                      <Divider sx={{ mb: 1.5, opacity: 0.3 }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                          }}
                        >
                          <SecurityIcon sx={{ fontSize: 14 }} /> Enemy Wave
                        </Typography>

                        <Stack direction='row' spacing={0.5}>
                          {isProvinceOpen(province) ? (
                            <>
                              {taken !== 'cater' && (
                                <Chip
                                  label='FIGHT'
                                  size='small'
                                  color='primary'
                                  clickable
                                  disabled={!!cooldowns[cooldownKey(province, 'fight')]}
                                  onClick={handleFightClick(province)}
                                  sx={actionChipSx}
                                />
                              )}
                              {taken !== 'fight' && (
                                <Chip
                                  label='CATER'
                                  size='small'
                                  variant='outlined'
                                  clickable
                                  disabled={!!cooldowns[cooldownKey(province, 'cater')]}
                                  onClick={handleCaterClick(province)}
                                  sx={actionChipSx}
                                />
                              )}
                            </>
                          ) : (
                            <Chip
                              label='OPEN'
                              size='small'
                              variant='outlined'
                              clickable
                              disabled={!!cooldowns[cooldownKey(province, 'open')]}
                              onClick={handleOpenClick(province)}
                              // Spans exactly what fight and cater span together, gap included, so
                              // the row's right edge does not move as provinces open.
                              sx={{ ...actionChipSx, width: ACTION_CHIP_WIDTH * 2 + ACTION_CHIP_GAP }}
                            />
                          )}
                        </Stack>
                      </Box>

                      {/*
                        The enemy units and the recommendation share this row, and it keeps its
                        height whether it holds them or the "visit on map" line, so opening a
                        province does not make its card taller and shove the rest of the list down.
                      */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 30 }}>
                        {enemyArmy.length > 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.75,
                              flex: '1 1 auto',
                              minWidth: 0,
                              // The recommendation keeps its width; a wave too wide for what is
                              // left scrolls rather than wraps, which would cost a second line.
                              overflowX: 'auto',
                              scrollbarWidth: 'none',
                              '&::-webkit-scrollbar': { display: 'none' },
                            }}
                          >
                            {enemyArmy.map((unit, idx) => {
                              const spriteIndex = getUnitSpriteIndex(unit.unitTypeId);
                              return (
                                <Tooltip key={idx} title={formatUnitName(unit.unitTypeId)} arrow>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      bgcolor: 'background.default',
                                      flexShrink: 0,
                                      height: 26,
                                      pr: 0,
                                      [WIDE_CARD]: { pr: 1 },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        backgroundImage: `url(${spriteUrl})`,
                                        backgroundPosition: `-${spriteIndex * 22}px 0px`,
                                        backgroundSize: '110px 22px',
                                        imageRendering: 'pixelated',
                                        mx: 0.5,
                                      }}
                                    />
                                    <Typography
                                      variant='caption'
                                      sx={{
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        display: 'none',
                                        [WIDE_CARD]: { display: 'block' },
                                      }}
                                    >
                                      {formatBuildingName(unit.unitTypeId)}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Box>
                        ) : (
                          <Typography
                            variant='caption'
                            color='text.disabled'
                            sx={{ flex: '1 1 auto', fontStyle: 'italic' }}
                          >
                            Visit on map to load units...
                          </Typography>
                        )}

                        {bestCounter &&
                          (() => {
                            // Multiply by 5 because the encounter requires 5 identical squads
                            const needed = (province.neededUnitsForOneSquad || 0) * 5;
                            const available = province.availableUnitsOfType || 0;
                            const hasEnough = available >= needed;
                            const score = Math.round(bestCounter.score * 10) / 10;

                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                                <Tooltip
                                  arrow
                                  title={`${formatUnitName(bestCounter.unit.unitTypeId)} - ${bestCounter.quality} (${score})`}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      border: '1px solid',
                                      borderColor: 'success.light',
                                      borderRadius: 1,
                                      bgcolor: 'success.lighter',
                                      height: 28,
                                      width: 'fit-content',
                                      pr: 1,
                                      [WIDE_CARD]: { pr: 1.5 },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        backgroundImage: `url(${spriteUrl})`,
                                        backgroundPosition: `-${getUnitSpriteIndex(bestCounter.unit.unitTypeId) * 22}px 0px`,
                                        backgroundSize: '110px 22px',
                                        imageRendering: 'pixelated',
                                        mx: 0.75,
                                      }}
                                    />
                                    <Typography
                                      variant='caption'
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap',
                                        color: getQualityColor(bestCounter.quality),
                                      }}
                                    >
                                      {formatBuildingName(bestCounter.unit.unitTypeId)}
                                      {/* Only a wide card has room for the wording; on a narrow one
                                          the quality is still in the colour and in the tooltip. */}
                                      <Box
                                        component='span'
                                        sx={{ display: 'none', [WIDE_CARD]: { display: 'inline' } }}
                                      >
                                        : {bestCounter.quality} ({score})
                                      </Box>
                                    </Typography>
                                  </Box>
                                </Tooltip>

                                {/* Unit Availability Display */}
                                <Tooltip
                                  arrow
                                  title={
                                    hasEnough
                                      ? `${needed.toLocaleString()} needed, ${available.toLocaleString()} available`
                                      : `Not enough units - ${needed.toLocaleString()} needed, ${available.toLocaleString()} available`
                                  }
                                >
                                  <Typography
                                    variant='caption'
                                    color={hasEnough ? 'text.secondary' : 'error.main'}
                                    sx={{ fontWeight: hasEnough ? 600 : 800, whiteSpace: 'nowrap' }}
                                  >
                                    <Box component='span' sx={{ display: 'none', [WIDE_CARD]: { display: 'inline' } }}>
                                      Units:{' '}
                                    </Box>
                                    {needed.toLocaleString()}/{available.toLocaleString()}
                                  </Typography>
                                </Tooltip>
                              </Box>
                            );
                          })()}
                      </Box>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Box>
      ) : (
        <Alert severity='info' sx={{ mt: 2 }}>
          Tournament data is NOT available. Please open the Tournament Map in the game.
        </Alert>
      )}
    </Box>
  );
};
