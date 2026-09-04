import React from 'react';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import { generateInventory } from '../../../inventory/generateInventory';
import { InventoryRowRef } from '../../../inventory/inventoryRowRef';
import { formatResourceName } from '../../../util/formatResourceName';
import { getBuildingFinder } from '../../buildingFinder';
import { useCity } from '../../CityContext';
import { ClearUpgradesResult, findClearUpgrades, UpgradeSuggestion } from './findClearUpgrades';
import { compareSize, fitsInPlace, isSameSize } from './sizeOrder';

interface UpgradesCityViewProps {
  onReplace: (blockId: number, item: InventoryRowRef, stage?: number) => void;
}

type Order = 'asc' | 'desc';
type GroupBy = 'none' | 'city' | 'item';

const formatAbs = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const formatPerSq = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

/**
 * A figure's own direction, not the row's. A smaller replacement can gain per square while
 * losing in total, and the reverse, so the two lines of a cell are coloured apart - one
 * colour for both reports a loss in the same green as the gain beside it.
 */
const deltaColor = (n: number) => {
  if (n > 0.001) return 'success.main';
  if (n < -0.001) return 'error.main';
  return 'text.secondary';
};

/**
 * Where an evolving item starts, where it is compared, and whether that is as far as it
 * goes - "Stage 1 ➔ 5 (max)" reads very differently from "Stage 1 ➔ 5 of 10", and without
 * the ceiling a low number looks like a shortfall even when the building has no more stages.
 */
const stageSummary = (row: UpgradeSuggestion) => {
  if (row.targetStage === undefined) return null;

  const atMax = row.maxStage !== undefined && row.targetStage >= row.maxStage;
  const reached = atMax ? `${row.targetStage} (max)` : `${row.targetStage}${row.maxStage ? ` of ${row.maxStage}` : ''}`;
  const stages =
    row.currentItemStage !== undefined && row.currentItemStage !== row.targetStage
      ? `Stage ${row.currentItemStage} ➔ ${reached}`
      : `Stage ${reached}`;

  if (row.artifactsNeeded) return `${stages} · uses ${row.artifactsNeeded} of your ${row.artifactsOwned} artifacts`;
  if (!atMax) return `${stages} · no artifacts to evolve it`;
  return stages;
};

/** A column header that toggles grouping by its column. */
const GroupHeader = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <Tooltip title={active ? 'Click to ungroup' : `Click to group by ${label.toLowerCase()}`}>
    <Box
      component='span'
      role='button'
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontWeight: active ? 'bold' : undefined,
        // The icon is faint until hovered or active, as the sort arrows in this table are.
        '& .group-icon': { opacity: active ? 1 : 0.35, transition: 'opacity 0.15s' },
        '&:hover .group-icon': { opacity: 1 },
      }}
    >
      {label}
      {active ? ' (grouped)' : ''}
      <GroupWorkIcon className='group-icon' color={active ? 'primary' : 'inherit'} sx={{ fontSize: 16 }} />
    </Box>
  </Tooltip>
);

export const UpgradesCityView = ({ onReplace }: UpgradesCityViewProps) => {
  const city = useCity();
  const { blocks, searchTerm } = city;
  const [result, setResult] = React.useState<ClearUpgradesResult | null>(null);
  const [noInventory, setNoInventory] = React.useState(false);
  const [orderBy, setOrderBy] = React.useState<string>('name');
  const [order, setOrder] = React.useState<Order>('asc');
  const [groupBy, setGroupBy] = React.useState<GroupBy>('none');
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  // Regrouping and re-sorting thousands of rows blocks the thread, so those updates run as
  // transitions: React paints the pending state before starting the work.
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    async function buildData() {
      if (!city.accountId) {
        setNoInventory(true);
        setResult(null);
        return;
      }

      const finder = getBuildingFinder();
      await finder.ensureInitialized();

      const inventory = await generateInventory(city.accountId, { includeTomeBuildings: true });
      if (!inventory) {
        setNoInventory(true);
        setResult(null);
        return;
      }

      setNoInventory(false);
      setResult(findClearUpgrades(Object.values(blocks), finder, city.evolvingBuildings, inventory.inventory));
    }
    void buildData();
  }, [blocks, city.accountId, city.evolvingBuildings]);

  const handleRequestSort = (property: string) => {
    startTransition(() => {
      if (orderBy === property) {
        setOrder(order === 'asc' ? 'desc' : 'asc');
      } else {
        setOrder(property === 'name' ? 'asc' : 'desc');
      }
      setOrderBy(property);
    });
  };

  const rows = React.useMemo(() => {
    if (!result) return [];

    let filtered = result.suggestions;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.oldName.toLowerCase().includes(term) ||
          s.newName.toLowerCase().includes(term) ||
          (s.fromTome?.toLowerCase().includes(term) ?? false),
      );
    }

    const perSquareDelta = (s: UpgradeSuggestion, key: string) =>
      (s.newValues[key] || 0) / (s.newWidth * s.newLength) - (s.oldValues[key] || 0) / (s.oldWidth * s.oldLength);

    const comparator = (a: UpgradeSuggestion, b: UpgradeSuggestion): number => {
      if (orderBy === 'name') return a.oldName.localeCompare(b.oldName) || a.newName.localeCompare(b.newName);
      if (orderBy === 'size') return compareSize(a, b);
      return perSquareDelta(a, orderBy) - perSquareDelta(b, orderBy);
    };

    return [...filtered].sort((a, b) => (order === 'desc' ? -comparator(a, b) : comparator(a, b)));
  }, [result, searchTerm, order, orderBy]);

  // Groups follow the sorted rows, so a group appears as high as its best row does.
  const groups = React.useMemo(() => {
    if (groupBy === 'none') return null;

    // Keyed by the individual placed building or inventory item, so two copies of the same
    // building are their own groups rather than being lumped together by name.
    const byKey = new Map<string, UpgradeSuggestion[]>();
    for (const row of rows) {
      const key = groupBy === 'city' ? String(row.blockId) : row.itemKey;
      const group = byKey.get(key);
      if (group) group.push(row);
      else byKey.set(key, [row]);
    }

    // An evolving item is named by the highest stage it could be raised to, matching the
    // stage its rows are compared at rather than the one it sits at in the inventory.
    const labelFor = (row: UpgradeSuggestion) =>
      groupBy === 'city'
        ? `${row.oldName}${row.oldLevel > 1 ? ` (Level ${row.oldLevel})` : ''}${row.oldStage ? ` (Stage ${row.oldStage})` : ''}`
        : `${row.newName}${row.targetStage ? ` (Stage ${row.targetStage}${row.maxStage ? ` of ${row.maxStage}` : ''})` : ''}${row.itemAmount > 1 ? ` ×${row.itemAmount}` : ''}${row.fromTome ? ` (via ${row.fromTome})` : ''}`;

    return [...byKey.entries()].map(([key, groupRows]) => ({ key, label: labelFor(groupRows[0]), rows: groupRows }));
  }, [rows, groupBy]);

  const toggleGroupBy = (target: 'city' | 'item') => {
    startTransition(() => {
      setGroupBy(groupBy === target ? 'none' : target);
      setCollapsed(new Set());
    });
  };

  const toggleCollapsed = (key: string) =>
    startTransition(() => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (!next.delete(key)) next.add(key);
        return next;
      });
    });

  const resourceName = (key: string) => formatResourceName(city.goodsNames, city.boostedGoods, key);
  const missingArtifact = result?.skippedMissingArtifact ?? [];
  const columnCount = 4 + (result?.resourceKeys.length || 0);

  const renderRow = (row: UpgradeSuggestion) => {
    const oldArea = row.oldWidth * row.oldLength;
    const newArea = row.newWidth * row.newLength;
    const sizeChanged = !isSameSize(row);
    // Two buildings sharing a name are told apart by their level.
    const showLevels = row.oldName === row.newName && row.oldLevel !== row.newLevel;

    return (
      <TableRow key={row.key} hover>
        <TableCell>
          <Tooltip title='Deletes the building and starts placing the replacement — you position it and make room if needed'>
            <Button
              size='small'
              variant='outlined'
              onClick={() => onReplace(row.blockId, { id: row.itemId, subtype: row.itemSubtype }, row.targetStage)}
            >
              Replace
            </Button>
          </Tooltip>
        </TableCell>
        <TableCell component='th' scope='row' sx={{ fontWeight: 500 }}>
          <Stack>
            <span>
              {row.oldName}
              {showLevels ? ` (Level ${row.oldLevel})` : ''}
              {row.oldStage ? ` (Stage ${row.oldStage})` : ''}
            </span>
            {row.oldOther.length > 0 && (
              <Typography variant='caption' color='warning.main'>
                also makes: {row.oldOther.map(resourceName).join(', ')}
              </Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell sx={{ fontWeight: 500 }}>
          <Stack>
            <span>
              {row.newName}
              {showLevels ? ` (Level ${row.newLevel})` : ''}
              {row.itemAmount > 1 ? ` ×${row.itemAmount}` : ''}
            </span>
            {row.fromTome && (
              <Typography variant='caption' color='text.secondary'>
                via {row.fromTome}
              </Typography>
            )}
            {row.targetStage !== undefined && (
              <Typography variant='caption' color='text.secondary'>
                {stageSummary(row)}
              </Typography>
            )}
            {row.newOther.length > 0 && (
              <Typography variant='caption' color='success.main'>
                also makes: {row.newOther.map(resourceName).join(', ')}
              </Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell align='center'>
          {sizeChanged ? (
            <Box component='span' sx={{ color: fitsInPlace(row) ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
              {row.oldWidth}x{row.oldLength} ➔ {row.newWidth}x{row.newLength}
            </Box>
          ) : (
            `${row.oldWidth}x${row.oldLength}`
          )}
        </TableCell>
        {result?.resourceKeys.map((key) => {
          const oldVal = row.oldValues[key] || 0;
          const newVal = row.newValues[key] || 0;
          if (oldVal === 0 && newVal === 0) {
            return (
              <TableCell key={key} align='right'>
                -
              </TableCell>
            );
          }

          const delta = newVal - oldVal;
          const perSq = newVal / newArea - oldVal / oldArea;
          const sign = delta > 0 ? '+' : '';
          const perSqSign = perSq > 0 ? '+' : '';

          return (
            <TableCell key={key} align='right'>
              <Tooltip title={`${formatAbs(oldVal)} ➔ ${formatAbs(newVal)}`}>
                <Stack sx={{ alignItems: 'flex-end' }}>
                  <Box component='span' sx={{ color: deltaColor(delta), fontWeight: 'bold' }}>
                    {sign}
                    {formatAbs(delta)}
                  </Box>
                  <Typography variant='caption' sx={{ color: deltaColor(perSq) }}>
                    {perSqSign}
                    {formatPerSq(perSq)}/sq
                  </Typography>
                </Stack>
              </Tooltip>
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  // Built once per change of content. Deliberately not a function of `isPending`, so
  // dimming the rows reuses these elements instead of rebuilding a few thousand of them -
  // otherwise the pending state itself takes about a second to appear.
  const bodyContent = React.useMemo(
    () =>
      groups
        ? groups.map((group) => (
            <React.Fragment key={group.key}>
              <TableRow
                hover
                onClick={() => toggleCollapsed(group.key)}
                sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
              >
                <TableCell colSpan={columnCount} sx={{ fontWeight: 'bold' }}>
                  {collapsed.has(group.key) ? '▸' : '▾'} {group.label}{' '}
                  <Typography component='span' variant='caption' color='text.secondary'>
                    ({group.rows.length} {group.rows.length === 1 ? 'option' : 'options'})
                  </Typography>
                </TableCell>
              </TableRow>
              {!collapsed.has(group.key) && group.rows.map(renderRow)}
            </React.Fragment>
          ))
        : rows.map(renderRow),
    // renderRow and toggleCollapsed are rebuilt every render; the values they close over
    // are listed here instead, in the same spirit as the city context's memo. Listing
    // renderRow itself would rebuild every row on every render, which is the second or so
    // of delay this memo exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, rows, collapsed, columnCount, result, city.goodsNames, city.boostedGoods, onReplace],
  );

  return (
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='body2' color='text.secondary'>
          Inventory buildings that beat a placed building on everything it provides (mana, seeds, orcs, unurium, nox and
          culture), per square and in total. Production is per 24h. Evolving buildings from the inventory are compared
          at the highest stage your artifacts can reach; placed evolving buildings are never suggested for replacement.
          Buildings a Tome can be opened for are weighed too, and say which Tome under their name.
        </Typography>
        {noInventory && (
          <Alert severity='info' sx={{ mt: 1 }}>
            No inventory data captured. Open your in-game inventory (Summonings tab) and refresh this page.
          </Alert>
        )}
        {missingArtifact.length > 0 && (
          <Alert severity='info' sx={{ mt: 1 }}>
            Not compared, because no artifact is recorded for {missingArtifact.length === 1 ? 'it' : 'them'} and so the
            stage {missingArtifact.length === 1 ? 'it' : 'they'} could reach is unknown:{' '}
            <strong>{missingArtifact.join(', ')}</strong>. Loading the game once refreshes this data.
          </Alert>
        )}
      </Box>
      {/* The old rows stay on screen, dimmed, while the new ones are worked out. */}
      <Box sx={{ height: 4 }}>{(isPending || (!result && !noInventory)) && <LinearProgress />}</Box>
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table stickyHeader size='small' aria-label='upgrade suggestions table'>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>
                <GroupHeader label='City Building' active={groupBy === 'city'} onClick={() => toggleGroupBy('city')} />
              </TableCell>
              <TableCell>
                <GroupHeader
                  label='Replacement from Inventory'
                  active={groupBy === 'item'}
                  onClick={() => toggleGroupBy('item')}
                />
              </TableCell>
              <TableCell align='center'>
                <TableSortLabel
                  active={orderBy === 'size'}
                  direction={orderBy === 'size' ? order : 'desc'}
                  onClick={() => handleRequestSort('size')}
                >
                  Size
                </TableSortLabel>
              </TableCell>
              {result?.resourceKeys.map((key) => (
                <TableCell key={key} align='right'>
                  <TableSortLabel
                    active={orderBy === key}
                    direction={orderBy === key ? order : 'desc'}
                    onClick={() => handleRequestSort(key)}
                  >
                    {resourceName(key)}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          {/* Only the rows dim: the headers stay live so another sort or grouping can be
              asked for without waiting for this one. */}
          <TableBody sx={{ opacity: isPending ? 0.4 : 1, transition: 'opacity 0.1s' }}>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                    {result ? 'No clear upgrades found in your inventory.' : 'Loading…'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {bodyContent}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
