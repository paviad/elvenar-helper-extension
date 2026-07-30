import React from 'react';
import {
  Alert,
  Box,
  Button,
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

const formatAbs = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const formatPerSq = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

export const UpgradesCityView = ({ onReplace }: UpgradesCityViewProps) => {
  const city = useCity();
  const { blocks, searchTerm } = city;
  const [result, setResult] = React.useState<ClearUpgradesResult | null>(null);
  const [noInventory, setNoInventory] = React.useState(false);
  const [orderBy, setOrderBy] = React.useState<string>('name');
  const [order, setOrder] = React.useState<Order>('asc');

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
    if (orderBy === property) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrder(property === 'name' ? 'asc' : 'desc');
    }
    setOrderBy(property);
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

  const resourceName = (key: string) => formatResourceName(city.goodsNames, city.boostedGoods, key);
  const missingArtifact = result?.skippedMissingArtifact ?? [];

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
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table stickyHeader size='small' aria-label='upgrade suggestions table'>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  City Building
                </TableSortLabel>
              </TableCell>
              <TableCell>Replacement from Inventory</TableCell>
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
                <TableCell colSpan={4 + (result?.resourceKeys.length || 0)}>
                  <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                    {result ? 'No clear upgrades found in your inventory.' : 'Loading…'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const oldArea = row.oldWidth * row.oldLength;
              const newArea = row.newWidth * row.newLength;
              const sizeChanged = !isSameSize(row);
              // Two buildings sharing a name are told apart by their level.
              const showLevels = row.oldName === row.newName && row.oldLevel !== row.newLevel;

              return (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <Tooltip title='Deletes the building and starts placing the replacement — you position it and make room if needed'>
                      <Button size='small' variant='outlined' onClick={() => onReplace(row.blockIds[0], row.itemId)}>
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
                        {row.count > 1 ? ` ×${row.count}` : ''}
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
                          {row.artifactsNeeded
                            ? ` (uses ${row.artifactsNeeded} of your ${row.artifactsOwned} artifacts)`
                            : ''}
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
                      <Box
                        component='span'
                        sx={{ color: fitsInPlace(row) ? 'success.main' : 'error.main', fontWeight: 'bold' }}
                      >
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
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
