import React, { useEffect, useMemo, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Alert, Box, Button, CircularProgress, List, ListItemButton, Stack, Typography } from '@mui/material';
import { StepStatus, stepStatuses, toChecklist, updateChecklist } from '../../city/movePlan/checklist';
import { Catalogue, catalogueOf, currentCity, sizeAtFrom } from '../../city/movePlan/fromGame';
import { clearMoveTarget, getMoveTarget, MoveTarget, moveTargetKey } from '../../city/movePlan/moveTargetStore';
import { applyAction } from '../../city/movePlan/rulesSimulator';
import { getBuildings } from '../../elvenar/getBuildings';
import { getBuildingSets } from '../../elvenar/getBuildingSets';
import { useAccount } from '../../elvenar/useAccount';
import { BuildingSet } from '../../model/buildingSet';
import { getAccountId, getOverlayStore } from '../overlayStore';
import { describeStep, describeUnresolved, Names } from './describeStep';
import { IsoStepMap } from './IsoStepMap';
import { stepMap } from './stepMapModel';

/**
 * The layout last sent from the planner. Read again whenever the planner sends another, so a
 * layout sent with the game open shows up without a reload.
 */
const useMoveTarget = (accountId: string | null) => {
  const [sent, setSent] = useState<MoveTarget | undefined | null>(null);
  useEffect(() => {
    if (!accountId) return;
    let live = true;
    const read = () => void getMoveTarget(accountId).then((target) => live && setSent(target));
    read();
    const key = moveTargetKey(accountId);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) read();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [accountId]);
  return sent;
};

/** The catalogue and the sets, read once: both change only with a game update. */
const useCatalogue = () => {
  const [data, setData] = useState<{
    catalogue: Catalogue;
    sets: BuildingSet[];
    names: Names;
    /** The game id a building of a kind is drawn under at a level. */
    spriteId: (kind: string, level: number) => string | undefined;
  }>();
  useEffect(() => {
    let live = true;
    void Promise.all([getBuildings(), getBuildingSets()]).then(([buildings, sets]) => {
      if (!live) return;
      const kindNames = new Map(buildings.map((b) => [b.base_name, b.name]));
      const typeNames = new Map(buildings.map((b) => [b.id, b.name]));
      const catalogue = catalogueOf(buildings);
      setData({
        catalogue,
        sets,
        spriteId: (kind, level) => catalogue.byKindAtLevel.get(`${kind}|${level}`)?.id,
        names: { kind: (kind) => kindNames.get(kind) ?? kind, type: (type) => typeNames.get(type) ?? type },
      });
    });
    return () => {
      live = false;
    };
  }, []);
  return data;
};

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  done: <CheckCircleIcon fontSize='small' color='success' />,
  next: <PlayCircleIcon fontSize='small' color='primary' />,
  waiting: <HourglassTopIcon fontSize='small' color='warning' />,
  later: <RadioButtonUncheckedIcon fontSize='small' color='disabled' />,
};

/**
 * The moves that turn the city into the layout sent from the planner, ticked off as the game
 * reports each one made. The list is worked out when the layout arrives and kept; after every
 * update the city is checked against each line, and only when the lines left stop being
 * playable - a move made off plan - are they worked out again.
 */
export const MovePlanView = () => {
  const accountId = getAccountId();
  const account = useAccount(accountId);
  const store = getOverlayStore();
  const checklist = store((state) => state.movePlan);
  const setChecklist = store((state) => state.setMovePlan);
  const sent = useMoveTarget(accountId);
  const data = useCatalogue();
  const [selected, setSelected] = useState<number | null>(null);

  const cityQuery = account?.cityQuery;
  const city = useMemo(
    () =>
      cityQuery && data
        ? currentCity(cityQuery.cityEntities, cityQuery.unlockedAreas ?? [], data.catalogue, data.sets).value
        : undefined,
    [cityQuery, data],
  );

  useEffect(() => {
    if (sent === null || !data) return;
    if (!sent) {
      if (checklist) setChecklist(undefined);
      return;
    }
    if (!city) return;
    const sizeAt = sizeAtFrom(data.catalogue);
    const next =
      checklist?.sentAt === sent.sentAt
        ? updateChecklist(checklist, city, sent.target, sizeAt)
        : toChecklist(city, sent.target, sizeAt, sent.sentAt);
    if (JSON.stringify(next) !== JSON.stringify(checklist)) {
      setChecklist(next);
    }
  }, [city, sent, data, checklist, setChecklist]);

  if (sent === null || !data || (sent && (!city || !checklist))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!sent || !checklist || !city) {
    return (
      <Box sx={{ p: 3, color: 'text.secondary' }}>
        <Typography variant='body2'>
          Arrange your city in the planner, then choose City ▸ Send Move Plan to Game. The moves that get your city
          there are listed here, and ticked off as you make them.
        </Typography>
      </Box>
    );
  }

  const statuses = stepStatuses(checklist, city);
  const done = checklist.steps.filter((step) => step.done).length;
  const shown = selected ?? statuses.indexOf('next');
  const allDone = done === checklist.steps.length;
  const kindOf = (id: number) => city.buildings.get(id)?.kind;

  const forget = () => {
    if (!accountId) return;
    setChecklist(undefined);
    void clearMoveTarget(accountId);
  };

  return (
    <Stack sx={{ p: 1, gap: 1 }}>
      <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant='subtitle2'>Layout from {sent.from}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {done} of {checklist.steps.length} done
          </Typography>
        </Box>
        <Button size='small' onClick={forget}>
          Clear
        </Button>
      </Stack>

      {allDone && checklist.unresolved.length === 0 && <Alert severity='success'>Your city matches the layout.</Alert>}

      <List dense disablePadding>
        {checklist.steps.map((step, index) => {
          const status = statuses[index];
          const text = describeStep(step, data.names);
          const open = index === shown && status !== 'done';
          const refusal = status === 'waiting' ? applyAction(city, step.action) : undefined;
          const waitingFor =
            refusal && !refusal.ok
              ? refusal.refusal === 'busy'
                ? 'Waiting for its upgrade to finish.'
                : 'Waiting for a free builder.'
              : undefined;
          const map = open ? stepMap(step, city) : undefined;
          return (
            <ListItemButton
              key={index}
              selected={open}
              onClick={() => setSelected(index === shown ? null : index)}
              sx={{ alignItems: 'flex-start', gap: 1, borderRadius: 1, opacity: status === 'done' ? 0.6 : 1 }}
            >
              <Box sx={{ pt: 0.25 }}>{STATUS_ICON[status]}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant='body2'
                  sx={{
                    textDecoration: status === 'done' ? 'line-through' : 'none',
                    fontWeight: status === 'next' ? 600 : 400,
                  }}
                >
                  {text.title}
                </Typography>
                {waitingFor && (
                  <Typography variant='caption' color='warning.main' component='div'>
                    {waitingFor}
                  </Typography>
                )}
                {open && text.detail && (
                  <Typography variant='caption' color='text.secondary' component='div'>
                    {text.detail}
                  </Typography>
                )}
                {map && (
                  <Box sx={{ mt: 1 }}>
                    <IsoStepMap model={map} spriteId={data.spriteId} />
                  </Box>
                )}
              </Box>
            </ListItemButton>
          );
        })}
      </List>

      {checklist.unresolved.length > 0 && (
        <Alert severity='warning'>
          <Typography variant='body2' sx={{ mb: 0.5 }}>
            The plan cannot do everything in the layout:
          </Typography>
          {checklist.unresolved.map((unresolved, index) => (
            <Typography key={index} variant='caption' component='div'>
              {describeUnresolved(unresolved, data.names, kindOf)}
            </Typography>
          ))}
        </Alert>
      )}
    </Stack>
  );
};
