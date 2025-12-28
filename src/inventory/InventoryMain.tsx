import * as React from 'react';
import { InventoryItem } from '../model/inventoryItem';
import { generateInventory } from './generateInventory';
import { TextField, MenuItem, Select, InputLabel, FormControl, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

export const InventoryMain = () => {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'chapter' | 'amount' | 'changedAt' | 'cc' | 'rr' | ''>('');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  React.useEffect(() => {
    async function fetchInventory() {
      const inventory = await generateInventory();
      setInventory(inventory);
    }
    fetchInventory();
  }, []);

  // Get unique types and subtypes for filter dropdowns
  const types = React.useMemo(() => Array.from(new Set(inventory.map(i => i.type))).sort(), [inventory]);

  // Filtered and searched inventory
  let filtered = inventory.filter(item => {
    const matchesSearch = (() => {
      if (!search) return true;
      const lower = search.toLowerCase();
      if (item.name && item.name.toLowerCase().includes(lower)) return true;
      if (item.type.toLowerCase().includes(lower)) return true;
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

  // Sorting
  if (sortBy) {
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortBy === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortBy === 'chapter') {
        aVal = a.chapter ?? '';
        bVal = b.chapter ?? '';
      } else if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === 'changedAt') {
        aVal = a.changedAt;
        bVal = b.changedAt;
      } else if (sortBy === 'cc') {
        aVal = a.resaleResources?.combiningcatalyst ?? 0;
        bVal = b.resaleResources?.combiningcatalyst ?? 0;
      } else if (sortBy === 'rr') {
        aVal = a.resaleResources?.royalrestoration ?? 0;
        bVal = b.resaleResources?.royalrestoration ?? 0;
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
  const totalTypeFiltered = inventory.filter(item => {
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesType;
  }).length;

  return (
    <Box p={2}>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Search (name, type)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
        />
        <FormControl size="small" style={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={e => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {types.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={1} fontWeight="bold">
        Showing {filtered.length} of {totalTypeFiltered} items
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
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
                Chapter {sortBy === 'chapter' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
                  setSortBy('changedAt');
                  setSortDir(sortBy === 'changedAt' && sortDir === 'asc' ? 'desc' : 'asc');
                }}
              >
                Changed At {sortBy === 'changedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.name || ''}</TableCell>
                <TableCell>{item.chapter ?? ''}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.amount}</TableCell>
                <TableCell>{item.resaleResources?.combiningcatalyst ?? ''}</TableCell>
                <TableCell>{item.resaleResources?.royalrestoration ?? ''}</TableCell>
                <TableCell>{new Date(item.changedAt * 1000).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
