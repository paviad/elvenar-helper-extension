import * as React from 'react';
import { InventoryItem } from '../model/inventoryItem';
import { generateInventory } from './generateInventory';
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useTabStore } from '../util/tabStore';

export const InventoryMain = () => {
  const [inventory, setInventory] = React.useState<InventoryItem[] | undefined>([]);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<
    'name' | 'chapter' | 'amount' | 'changedAt' | 'cc' | 'rr' | 'spellFragments' | 'size' | ''
  >('');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  const [aggregate, setAggregate] = React.useState(false);

  const accountId = useTabStore((state) => state.accountId);

  React.useEffect(() => {
    async function fetchInventory() {
      if (!accountId) {
        return;
      }
      const inventory = await generateInventory(accountId);
      setInventory(inventory);
    }
    fetchInventory();
  }, [accountId]);

  // Get unique types and subtypes for filter dropdowns
  const types = React.useMemo(() => Array.from(new Set((inventory || []).map((i) => i.type))).sort(), [inventory]);

  // Filtered and searched inventory
  const filtered = (inventory || []).filter((item) => {
    const matchesSearch = (() => {
      if (!search) return true;
      const lower = search.toLowerCase();
      if (item.name && item.name.toLowerCase().includes(lower)) return true;
      if (item.type.toLowerCase().includes(lower)) return true;
      if (item.size && item.size.toLowerCase().includes(lower)) return true;
      if (item.resaleResources) {
        for (const key of Object.keys(item.resaleResources)) {
          if (key.toLowerCase().includes(lower)) return true;
        }
      }
      return false;
    })();
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Aggregate by name if toggle is on
  interface AggregatedRow {
    name: string;
    chapters: Set<number>;
    type: string;
    amount: number;
    cc: number;
    rr: number;
    spellFragments: number;
    size?: string;
  }
  type AggregatedRowDisplay = Omit<AggregatedRow, 'chapters'> & { chapters: string };
  function isAggregatedRowDisplay(row: InventoryItem | AggregatedRowDisplay): row is AggregatedRowDisplay {
    return (
      typeof (row as AggregatedRowDisplay).cc === 'number' && typeof (row as AggregatedRowDisplay).chapters === 'string'
    );
  }
  let displayRows: (InventoryItem | AggregatedRowDisplay)[] = filtered;
  if (aggregate) {
    const map = new Map<string, AggregatedRow>();
    for (const item of filtered) {
      const key = item.name || '';
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          chapters: new Set<number>(),
          type: item.type,
          amount: 0,
          cc: 0,
          rr: 0,
          spellFragments: 0,
          size: item.size,
        });
      }
      const agg = map.get(key);
      if (agg) {
        if (item.chapter !== undefined && item.chapter !== null) agg.chapters.add(item.chapter);
        agg.amount += item.amount || 0;
        agg.cc += (item.resaleResources?.combiningcatalyst || 0) * (item.amount || 0);
        agg.rr += (item.resaleResources?.royalrestoration || 0) * (item.amount || 0);
        agg.spellFragments += (item.spellFragments || 0) * (item.amount || 0);
      }
    }
    displayRows = Array.from(map.values()).map((row) => ({
      ...row,
      chapters: Array.from(row.chapters)
        .sort((a, b) => (a as number) - (b as number))
        .join(', '),
    }));
  }

  // Sorting
  if (sortBy) {
    displayRows = [...displayRows].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortBy === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortBy === 'chapter') {
        aVal = isAggregatedRowDisplay(a) ? a.chapters : a.chapter ?? '';
        bVal = isAggregatedRowDisplay(b) ? b.chapters : b.chapter ?? '';
      } else if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === 'changedAt') {
        aVal = isAggregatedRowDisplay(a) ? '' : a.changedAt ?? '';
        bVal = isAggregatedRowDisplay(b) ? '' : b.changedAt ?? '';
      } else if (sortBy === 'cc') {
        aVal = isAggregatedRowDisplay(a) ? a.cc : a.resaleResources?.combiningcatalyst ?? 0;
        bVal = isAggregatedRowDisplay(b) ? b.cc : b.resaleResources?.combiningcatalyst ?? 0;
      } else if (sortBy === 'rr') {
        aVal = isAggregatedRowDisplay(a) ? a.rr : a.resaleResources?.royalrestoration ?? 0;
        bVal = isAggregatedRowDisplay(b) ? b.rr : b.resaleResources?.royalrestoration ?? 0;
      } else if (sortBy === 'spellFragments') {
        aVal = isAggregatedRowDisplay(a) ? a.spellFragments : a.spellFragments ?? 0;
        bVal = isAggregatedRowDisplay(b) ? b.spellFragments : b.spellFragments ?? 0;
      } else if (sortBy === 'size') {
        aVal = (a as InventoryItem).size || '';
        bVal = (b as InventoryItem).size || '';
      }
      if (aVal === bVal) return 0;
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  // Total items if only type filter is applied (no text filter)
  const totalTypeFiltered = (inventory || []).filter((item) => {
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesType;
  }).length;

  return (
    <Box p={2}>
      <Box display='flex' gap={2} mb={2} alignItems='center'>
        <TextField
          label='Search (name, type)'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size='small'
        />
        <FormControl size='small' style={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label='Type' onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value=''>All</MenuItem>
            {types.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={aggregate} onChange={(e) => setAggregate(e.target.checked)} />}
          label='Aggregate by Name'
        />
      </Box>
      <Box mb={1} fontWeight='bold'>
        Showing {displayRows.length} of {totalTypeFiltered} items
      </Box>
      {((inventory !== undefined) && (
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('name');
                    setSortDir(sortBy === 'name' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('chapter');
                    setSortDir(sortBy === 'chapter' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Chapter{aggregate ? 's' : ''} {sortBy === 'chapter' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('amount');
                    setSortDir(sortBy === 'amount' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Amount {sortBy === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('size');
                    setSortDir(sortBy === 'size' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Size {sortBy === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('cc');
                    setSortDir(sortBy === 'cc' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  CC {sortBy === 'cc' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('rr');
                    setSortDir(sortBy === 'rr' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  RR {sortBy === 'rr' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('spellFragments');
                    setSortDir(sortBy === 'spellFragments' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Spell Fragments {sortBy === 'spellFragments' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('changedAt');
                    setSortDir(sortBy === 'changedAt' && sortDir === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Changed At {sortBy === 'changedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((item, idx) => (
                <TableRow key={('id' in item ? item.id : item.name) ?? idx}>
                  <TableCell>{item.name || ''}</TableCell>
                  <TableCell>{isAggregatedRowDisplay(item) ? item.chapters : item.chapter ?? ''}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.amount}</TableCell>
                  <TableCell>{(item as InventoryItem).size || ''}</TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.cc : item.resaleResources?.combiningcatalyst ?? ''}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.rr : item.resaleResources?.royalrestoration ?? ''}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.spellFragments : item.spellFragments ?? ''}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item)
                      ? '<n/a>'
                      : item.changedAt
                      ? new Date(item.changedAt * 1000).toLocaleString()
                      : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )) || (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Box textAlign="center">
            <Box fontSize={28} fontWeight="bold" color="text.secondary" mb={1}>
              Inventory not found
            </Box>
            <Box fontSize={20} color="text.secondary">
              Please open your inventory in Elvenar and switch to the "Summons" tab to load the data.<br />
              Then refresh this page.
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
