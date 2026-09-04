import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { getBuildingFinder } from '../city/buildingFinder';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { InventoryItem } from '../model/inventoryItem';
import { formatResourceName } from '../util/formatResourceName';
import { useTabStore } from '../util/tabStore';
import { generateInventory } from './generateInventory';
import { getInventoryRowKey } from './inventoryRowRef';

interface InventoryItemWithStats extends InventoryItem {
  provisions: Record<string, number>;
  production: Record<string, number>;
}

interface AggregatedRow {
  name: string;
  chapters: Set<number>;
  /** The tomes the rows came out of, where they are buildings a tome can be opened for. */
  fromTomes: Set<string>;
  type: string;
  amount: number;
  cc: number;
  rr: number;
  spellFragments: number;
  size?: string;
  provisions: Record<string, number>;
  production: Record<string, number>;
  totalArea: number;
}

type AggregatedRowDisplay = Omit<AggregatedRow, 'chapters' | 'fromTomes'> & { chapters: string; fromTome?: string };

function isAggregatedRowDisplay(row: InventoryItemWithStats | AggregatedRowDisplay): row is AggregatedRowDisplay {
  return (
    typeof (row as AggregatedRowDisplay).cc === 'number' && typeof (row as AggregatedRowDisplay).chapters === 'string'
  );
}

/**
 * What tells one row from another: an aggregate its type and name, since a building in the
 * inventory and one inside a tome can share a name; anything else what names it to the city.
 */
function getRowKey(row: InventoryItemWithStats | AggregatedRowDisplay, index: number): string | number {
  if (isAggregatedRowDisplay(row)) {
    return `${row.type}|${row.name}`;
  }
  return row.id === undefined ? index : getInventoryRowKey(row);
}

export const InventoryMain = () => {
  const [inventory, setInventory] = React.useState<InventoryItemWithStats[] | undefined>([]);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [allResourceKeys, setAllResourceKeys] = React.useState<string[]>([]);
  const [goodsNames, setGoodsNames] = React.useState<Record<string, string>>({});
  const [boostedGoods, setBoostedGoods] = React.useState<string[]>([]);

  const accountId = useTabStore((state) => state.accountId);
  const accountData = useTabStore((state) => state.accountData);
  const navigate = useNavigate();

  // Zustand Store UI State
  const search = useTabStore((state) => state.invSearch);
  const setSearch = useTabStore((state) => state.setInvSearch);
  const typeFilter = useTabStore((state) => state.invTypeFilter);
  const setTypeFilter = useTabStore((state) => state.setInvTypeFilter);
  const sortBy = useTabStore((state) => state.invSortBy);
  const setSortBy = useTabStore((state) => state.setInvSortBy);
  const sortDir = useTabStore((state) => state.invSortDir);
  const setSortDir = useTabStore((state) => state.setInvSortDir);
  const aggregate = useTabStore((state) => state.invAggregate);
  const setAggregate = useTabStore((state) => state.setInvAggregate);
  const showPerSquare = useTabStore((state) => state.invShowPerSquare);
  const setShowPerSquare = useTabStore((state) => state.setInvShowPerSquare);

  React.useEffect(() => {
    async function fetchInventory() {
      if (!accountId) {
        return;
      }
      if (!accountData?.cityQuery) {
        return;
      }

      const inventoryData = await generateInventory(accountId, { includeTomeBuildings: true });
      if (!inventoryData) {
        return;
      }

      const { inventory: rawInventory } = inventoryData;

      const finder = getBuildingFinder();
      await finder.ensureInitialized();

      const enrichedInventory: InventoryItemWithStats[] = [];
      const resourceKeys = new Set<string>();

      for (const item of rawInventory) {
        const enrichedItem: InventoryItemWithStats = {
          ...item,
          provisions: {},
          production: {},
        };

        if (item.building) {
          const { provisions, production } = item.building;

          Object.entries(provisions || {}).forEach(([k, v]) => {
            if (v > 0) {
              enrichedItem.provisions[k] = v;
              resourceKeys.add(k);
            }
          });
          Object.entries(production || {}).forEach(([k, v]) => {
            if (['mana', 'orcs', 'seeds', 'unurium', 'nox'].includes(k) && v > 0) {
              enrichedItem.production[k] = v;
              resourceKeys.add(k);
            }
          });
        }
        enrichedInventory.push(enrichedItem);
      }

      const sortedKeys = Array.from(resourceKeys).sort((a, b) => {
        const priority = ['population', 'culture', 'mana', 'seeds', 'orcs', 'unurium', 'nox'];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      setAllResourceKeys(sortedKeys);
      setInventory(enrichedInventory);

      const goodsNames = await getGoodsNames();
      const boostedGoods = accountData.cityQuery.boostedGoods;
      setGoodsNames(goodsNames);
      setBoostedGoods(boostedGoods);
    }
    void fetchInventory();
  }, [accountId, accountData]);

  const types = React.useMemo(() => Array.from(new Set((inventory || []).map((i) => i.type))).sort(), [inventory]);

  const filtered = (inventory || []).filter((item) => {
    const matchesSearch = (() => {
      if (!search) return true;
      const lower = search.toLowerCase();
      if (item.name && item.name.toLowerCase().includes(lower)) return true;
      if (item.type.toLowerCase().includes(lower)) return true;
      if (item.size && item.size.toLowerCase().includes(lower)) return true;
      if (item.fromTome && item.fromTome.toLowerCase().includes(lower)) return true;
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

  let displayRows: (InventoryItemWithStats | AggregatedRowDisplay)[] = filtered;
  if (aggregate) {
    const map = new Map<string, AggregatedRow>();
    for (const item of filtered) {
      // Typed as well as named, so a building a tome can be opened for is kept apart from
      // one of the same name already in the inventory: a total made up of buildings not yet
      // chosen would overstate what is in hand.
      const key = `${item.type}|${item.name || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          name: item.name || '',
          chapters: new Set<number>(),
          fromTomes: new Set<string>(),
          type: item.type,
          amount: 0,
          cc: 0,
          rr: 0,
          spellFragments: 0,
          size: item.size,
          provisions: {},
          production: {},
          totalArea: 0,
        });
      }
      const agg = map.get(key);
      if (agg) {
        const qty = item.amount || 0;
        if (item.chapter !== undefined && item.chapter !== null) agg.chapters.add(item.chapter);
        if (item.fromTome) agg.fromTomes.add(item.fromTome);
        agg.amount += qty;
        agg.cc += (item.resaleResources?.combiningcatalyst || 0) * qty;
        agg.rr += (item.resaleResources?.royalrestoration || 0) * qty;
        agg.spellFragments += (item.spellFragments || 0) * qty;

        let itemArea = 0;
        if (item.size) {
          const [w, h] = item.size.split('x').map(Number);
          if (!isNaN(w) && !isNaN(h)) itemArea = w * h;
        }
        agg.totalArea += itemArea * qty;

        Object.entries(item.provisions).forEach(([k, v]) => {
          agg.provisions[k] = (agg.provisions[k] || 0) + v * qty;
        });
        Object.entries(item.production).forEach(([k, v]) => {
          agg.production[k] = (agg.production[k] || 0) + v * qty;
        });
      }
    }
    displayRows = Array.from(map.values()).map(({ fromTomes, ...row }) => ({
      ...row,
      chapters: Array.from(row.chapters)
        .sort((a, b) => a - b)
        .join(', '),
      fromTome: fromTomes.size > 0 ? Array.from(fromTomes).sort().join(', ') : undefined,
    }));
  }

  const handleSortRequest = (property: string) => {
    const isAsc = sortBy === property && sortDir === 'asc';
    setSortBy(property);
    if (sortBy !== property) {
      if (['name'].includes(property)) {
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
    } else {
      setSortDir(isAsc ? 'desc' : 'asc');
    }
  };

  if (sortBy) {
    displayRows = [...displayRows].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortBy === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortBy === 'chapter') {
        aVal = isAggregatedRowDisplay(a) ? a.chapters : (a.chapter ?? '');
        bVal = isAggregatedRowDisplay(b) ? b.chapters : (b.chapter ?? '');
      } else if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === 'changedAt') {
        aVal = isAggregatedRowDisplay(a) ? '' : (a.changedAt ?? '');
        bVal = isAggregatedRowDisplay(b) ? '' : (b.changedAt ?? '');
      } else if (sortBy === 'cc') {
        aVal = isAggregatedRowDisplay(a) ? a.cc : (a.resaleResources?.combiningcatalyst ?? 0);
        bVal = isAggregatedRowDisplay(b) ? b.cc : (b.resaleResources?.combiningcatalyst ?? 0);
      } else if (sortBy === 'rr') {
        aVal = isAggregatedRowDisplay(a) ? a.rr : (a.resaleResources?.royalrestoration ?? 0);
        bVal = isAggregatedRowDisplay(b) ? b.rr : (b.resaleResources?.royalrestoration ?? 0);
      } else if (sortBy === 'spellFragments') {
        aVal = isAggregatedRowDisplay(a) ? a.spellFragments : (a.spellFragments ?? 0);
        bVal = isAggregatedRowDisplay(b) ? b.spellFragments : (b.spellFragments ?? 0);
      } else if (sortBy === 'size') {
        aVal = (a as InventoryItem).size || '';
        bVal = (b as InventoryItem).size || '';
      } else if (allResourceKeys.includes(sortBy)) {
        const getResVal = (row: typeof a) => {
          const val = (row.provisions[sortBy] || 0) + (row.production[sortBy] || 0);
          if (showPerSquare) {
            let area = 0;
            if (isAggregatedRowDisplay(row)) {
              area = row.totalArea;
            } else {
              if (row.size) {
                const [w, h] = row.size.split('x').map(Number);
                if (!isNaN(w) && !isNaN(h)) area = w * h;
              }
            }
            return area > 0 ? val / area : 0;
          }
          return val;
        };
        aVal = getResVal(a);
        bVal = getResVal(b);
      }

      if (aVal === bVal) return 0;
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  const totalTypeFiltered = (inventory || []).filter((item) => {
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesType;
  }).length;

  const handleCopyToClipboard = () => {
    const headers = [
      'Name',
      aggregate ? 'Chapters/Levels' : 'Chapter/Level',
      'Type',
      'Tome',
      'Amount',
      'Size',
      'CC',
      'RR',
      'Spell Fragments',
      'Changed At',
      ...allResourceKeys.map((k) => `${formatResourceName(goodsNames, boostedGoods, k)}${showPerSquare ? '/sq' : ''}`),
    ];

    const rows = displayRows.map((row) => {
      const name = row.name || '';
      const chapter = isAggregatedRowDisplay(row) ? row.chapters : (row.chapter ?? '');
      const type = row.type || '';
      const tome = row.fromTome || '';
      const amount = row.amount || 0;
      const size = row.size || '';
      const cc = isAggregatedRowDisplay(row) ? row.cc : (row.resaleResources?.combiningcatalyst ?? '');
      const rr = isAggregatedRowDisplay(row) ? row.rr : (row.resaleResources?.royalrestoration ?? '');
      const sf = isAggregatedRowDisplay(row) ? row.spellFragments : (row.spellFragments ?? '');
      const date = isAggregatedRowDisplay(row)
        ? ''
        : row.changedAt
          ? new Date(row.changedAt * 1000).toLocaleString()
          : '';

      const resCols = allResourceKeys.map((k) => {
        const val = (row.provisions[k] || 0) + (row.production[k] || 0);
        if (val <= 0) return '';
        if (showPerSquare) {
          let area = 0;
          if (isAggregatedRowDisplay(row)) area = row.totalArea;
          else if (row.size) {
            const [w, h] = row.size.split('x').map(Number);
            area = w * h;
          }
          return area > 0 ? (val / area).toFixed(1) : '0';
        }
        return val;
      });

      return [name, chapter, type, tome, amount, size, cc, rr, sf, date, ...resCols].join('\t');
    });

    const textData = [headers.join('\t'), ...rows].join('\n');

    const textArea = document.createElement('textarea');
    textArea.value = textData;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setToastOpen(true);
    } catch (err) {
      console.error('ElvenAssist: Unable to copy to clipboard', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <Box
      sx={{
        p: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          alignItems: 'center',
        }}
      >
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
        <FormControlLabel
          control={<Switch checked={showPerSquare} onChange={(e) => setShowPerSquare(e.target.checked)} />}
          label='Per Square'
        />
        <Button
          variant='outlined'
          startIcon={<ContentCopyIcon />}
          onClick={handleCopyToClipboard}
          size='small'
          sx={{ ml: 'auto' }}
        >
          Copy Table
        </Button>
      </Box>
      <Box
        sx={{
          mb: 1,
          fontWeight: 'bold',
        }}
      >
        Showing {displayRows.length} of {totalTypeFiltered} items
      </Box>
      {(inventory !== undefined && (
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortDir : 'asc'}
                    onClick={() => handleSortRequest('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'chapter'}
                    direction={sortBy === 'chapter' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('chapter')}
                  >
                    Ch/Lev
                  </TableSortLabel>
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'amount'}
                    direction={sortBy === 'amount' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('amount')}
                  >
                    #
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'size'}
                    direction={sortBy === 'size' ? sortDir : 'asc'}
                    onClick={() => handleSortRequest('size')}
                  >
                    Size
                  </TableSortLabel>
                </TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'cc'}
                    direction={sortBy === 'cc' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('cc')}
                  >
                    CC
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'rr'}
                    direction={sortBy === 'rr' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('rr')}
                  >
                    RR
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'spellFragments'}
                    direction={sortBy === 'spellFragments' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('spellFragments')}
                  >
                    Spell Fragments
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'changedAt'}
                    direction={sortBy === 'changedAt' ? sortDir : 'desc'}
                    onClick={() => handleSortRequest('changedAt')}
                  >
                    Changed At
                  </TableSortLabel>
                </TableCell>
                {allResourceKeys.map((key) => (
                  <TableCell key={key}>
                    <TableSortLabel
                      active={sortBy === key}
                      direction={sortBy === key ? sortDir : 'desc'}
                      onClick={() => handleSortRequest(key)}
                    >
                      {formatResourceName(goodsNames, boostedGoods, key)}
                      {showPerSquare ? '/sq' : ''}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((item, idx) => (
                <TableRow key={getRowKey(item, idx)}>
                  <TableCell>
                    {item.name || ''}
                    {item.fromTome && (
                      <Typography variant='caption' component='div' color='text.secondary'>
                        via {item.fromTome}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{isAggregatedRowDisplay(item) ? item.chapters : (item.chapter ?? '')}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.amount}</TableCell>
                  <TableCell>{(item as InventoryItem).size || ''}</TableCell>
                  <TableCell>
                    {!isAggregatedRowDisplay(item) && item.type.toLowerCase() === 'building' && (
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => {
                          const buildId = item.id;
                          if (buildId) {
                            void navigate(`/city?buildId=${buildId}`);
                          }
                        }}
                      >
                        Place
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.cc : (item.resaleResources?.combiningcatalyst ?? '')}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.rr : (item.resaleResources?.royalrestoration ?? '')}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item) ? item.spellFragments : (item.spellFragments ?? '')}
                  </TableCell>
                  <TableCell>
                    {isAggregatedRowDisplay(item)
                      ? '<n/a>'
                      : item.changedAt
                        ? new Date(item.changedAt * 1000).toLocaleString(undefined, {
                            hour12: false,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                  </TableCell>
                  {allResourceKeys.map((key) => {
                    const val = (item.provisions[key] || 0) + (item.production[key] || 0);
                    let display = '-';
                    if (val > 0) {
                      if (showPerSquare) {
                        let area = 0;
                        if (isAggregatedRowDisplay(item)) {
                          area = item.totalArea;
                        } else {
                          if (item.size) {
                            const [w, h] = item.size.split('x').map(Number);
                            if (!isNaN(w) && !isNaN(h)) area = w * h;
                          }
                        }
                        if (area > 0) display = (val / area).toLocaleString(undefined, { maximumFractionDigits: 1 });
                      } else {
                        display = val.toLocaleString();
                      }
                    }
                    return (
                      <TableCell key={key} align='right'>
                        {display}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )) || (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                fontSize: 28,
                fontWeight: 'bold',
                color: 'text.secondary',
                mb: 1,
              }}
            >
              Inventory not found
            </Box>
            <Box
              sx={{
                fontSize: 20,
                color: 'text.secondary',
              }}
            >
              Please open your inventory in Elvenar and switch to the "Summons" tab to load the data.
              <br />
              Then refresh this page.
            </Box>
          </Box>
        </Box>
      )}
      {/* Copied Feedback Toast */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        message='Table copied to clipboard'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
