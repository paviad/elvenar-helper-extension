import React from 'react';
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
import { formatResourceName } from '../../../util/formatResourceName';
import { getBuildingFinder } from '../../buildingFinder';
import { useCity } from '../../CityContext';
import { ClearUpgradesResult, findClearUpgrades, UpgradeSuggestion } from './findClearUpgrades';
import { compareSize, fitsInPlace, isSameSize } from './sizeOrder';

interface UpgradesCityViewProps {
  onReplace: (blockId: number, itemId: number) => void;
}

type Order = 'asc' | 'desc';
type GroupBy = 'none' | 'city' | 'item';

const formatAbs = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const formatPerSq = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** A column header that toggles grouping by its column. */
const GroupHeader = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <Tooltip title={active ? 'Click to ungroup' : `Click to group by ${label.toLowerCase()}`}>
    <Box
      component='span'
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        fontWeight: active ? 'bold' : undefined,
        textDecoration: active ? 'underline' : undefined,
        '&:hover': { textDecoration: 'underline' },
      }}
    >
      {label}
      {active ? ' (grouped)' : ''}
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

      const inventory = await generateInventory(city.accountId);
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
        (s) => s.oldName.toLowerCase().includes(term) || s.newName.toLowerCase().includes(term),
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
      const key = groupBy === 'city' ? String(row.blockId) : String(row.itemId);
      const group = byKey.get(key);
      if (group) group.push(row);
      else byKey.set(key, [row]);
    }

    const labelFor = (row: UpgradeSuggestion) =>
      groupBy === 'city'
        ? `${row.oldName}${row.oldLevel > 1 ? ` (Level ${row.oldLevel})` : ''}${row.oldStage ? ` (Stage ${row.oldStage})` : ''}`
        : `${row.newName}${row.currentItemStage ? ` (Stage ${row.currentItemStage})` : ''}${row.itemAmount > 1 ? ` ×${row.itemAmount}` : ''}`;

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
            <Button size='small' variant='outlined' onClick={() => onReplace(row.blockId, row.itemId)}>
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
            {row.targetStage !== undefined && (
              <Typography variant='caption' color='text.secondary'>
                at Stage {row.targetStage}
                {row.artifactsNeeded ? ` (uses ${row.artifactsNeeded} of your ${row.artifactsOwned} artifacts)` : ''}
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
          const improved = delta > 0.001 || perSq > 0.001;
          const color = improved ? 'success.main' : 'text.secondary';
          const sign = delta > 0 ? '+' : '';
          const perSqSign = perSq > 0 ? '+' : '';

          return (
            <TableCell key={key} align='right'>
              <Tooltip title={`${formatAbs(oldVal)} ➔ ${formatAbs(newVal)}`}>
                <Stack sx={{ alignItems: 'flex-end' }}>
                  <Box component='span' sx={{ color, fontWeight: 'bold' }}>
                    {sign}
                    {formatAbs(delta)}
                  </Box>
                  <Typography variant='caption' sx={{ color }}>
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

  return (
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='body2' color='text.secondary'>
          Inventory buildings that beat a placed building on everything it provides (mana, seeds, orcs, unurium, nox and
          culture), per square and in total. Production is per 24h. Evolving buildings from the inventory are compared
          at the highest stage your artifacts can reach; placed evolving buildings are never suggested for replacement.
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
      <TableContainer
        sx={{
          flexGrow: 1,
          opacity: isPending ? 0.4 : 1,
          pointerEvents: isPending ? 'none' : undefined,
          transition: 'opacity 0.1s',
        }}
      >
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
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                    {result ? 'No clear upgrades found in your inventory.' : 'Loading…'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {groups?.map((group) => (
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
            ))}
            {!groups && rows.map(renderRow)}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
