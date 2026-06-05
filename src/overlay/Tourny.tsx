import React, { useEffect, useMemo, useState } from 'react';
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
export const Tourny = () => {
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

  const [now, setNow] = useState(Date.now());

  // Priority UI Control State
  const [modBuilding, setModBuilding] = useState<TrainingBuilding | 'any'>('any');
  const [modTroop, setModTroop] = useState<TroopType | 'any'>('any');
  const [modFactor, setModFactor] = useState<number | string>(1.5);

  useEffect(() => {
    // Refresh the component every minute to update the "time left" counters automatically
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const accountId = getAccountId();
      if (!accountId) return;
      await loadSingleAccountFromStorage(accountId);
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
        setUnitAlmanac(almanac);
        const availableUnitTypeIds = armyDetails.availableUnitTypeIds as UnitType[];
        const rosterUnits = almanac.filter((unit) => availableUnitTypeIds.includes(unit.unitTypeId));
        setAvailableRoster(rosterUnits);
      } catch (err) {
        console.error('Failed to load unit types:', err);
      }
    }
    void fetchData();
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
            const size = Math.floor(squadSize / unitWeight);
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
  }, [tournyData, runningTourny, availableRoster, unitAlmanac, armyDetails, modifiers]);

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
    window.postMessage(
      {
        type: 'tournyFight',
        payload: { q: province.q, r: province.r, unit } satisfies TournyFight,
      },
      '*',
    );
  };

  const handleCaterClick = (province: ExtendedProvince) => () => {
    window.postMessage(
      {
        type: 'tournyCater',
        payload: { q: province.q, r: province.r },
      },
      '*',
    );
  };

  const handleOpenClick = (province: ExtendedProvince) => () => {
    window.postMessage(
      {
        type: 'tournyOpen',
        payload: { q: province.q, r: province.r },
      },
      '*',
    );
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
    <Box
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
          Tournament Overview
        </Typography>
      </Box>

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

                      <Stack spacing={1.5}>
                        <Box>
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
                                  <Chip
                                    label='FIGHT'
                                    size='small'
                                    color='primary'
                                    clickable
                                    onClick={handleFightClick(province)}
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, borderRadius: 0.5 }}
                                  />
                                  <Chip
                                    label='CATER'
                                    size='small'
                                    variant='outlined'
                                    clickable
                                    onClick={handleCaterClick(province)}
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, borderRadius: 0.5 }}
                                  />
                                </>
                              ) : (
                                <Chip
                                  label='OPEN'
                                  size='small'
                                  variant='outlined'
                                  clickable
                                  onClick={handleOpenClick(province)}
                                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, borderRadius: 0.5 }}
                                />
                              )}
                            </Stack>
                          </Box>

                          {enemyArmy.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
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
                                        pr: 1,
                                        height: 26,
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
                                      <Typography variant='caption' sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
                                        {formatBuildingName(unit.unitTypeId)}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          ) : (
                            <Typography variant='caption' color='text.disabled' sx={{ fontStyle: 'italic' }}>
                              Visit on map to load units...
                            </Typography>
                          )}
                        </Box>

                        {bestCounter &&
                          (() => {
                            // Multiply by 5 because the encounter requires 5 identical squads
                            const needed = (province.neededUnitsForOneSquad || 0) * 5;
                            const available = province.availableUnitsOfType || 0;
                            const hasEnough = available >= needed;

                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    border: '1px solid',
                                    borderColor: 'success.light',
                                    borderRadius: 1,
                                    bgcolor: 'success.lighter',
                                    pr: 1.5,
                                    height: 28,
                                    width: 'fit-content',
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
                                      mx: 1,
                                    }}
                                  />
                                  <Typography
                                    variant='caption'
                                    sx={{
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      color: getQualityColor(bestCounter.quality),
                                    }}
                                  >
                                    {formatBuildingName(bestCounter.unit.unitTypeId)}: {bestCounter.quality} (
                                    {Math.round(bestCounter.score * 10) / 10})
                                  </Typography>
                                </Box>

                                {/* Unit Availability Display */}
                                {hasEnough ? (
                                  <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                                    Units: {needed.toLocaleString()} / {available.toLocaleString()}
                                  </Typography>
                                ) : (
                                  <Chip
                                    size='small'
                                    color='error'
                                    label={`Not enough units (${needed.toLocaleString()} / ${available.toLocaleString()})`}
                                    sx={{ height: 24, fontSize: '0.65rem', fontWeight: 'bold' }}
                                  />
                                )}
                              </Box>
                            );
                          })()}
                      </Stack>
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
