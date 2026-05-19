import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  FormControlLabel,
  Switch,
  TableSortLabel,
  Button,
  Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useCity } from '../../CityContext';
import { BuildingFinder } from '../../buildingFinder';
import { getBuildingProvisionsAndProduction } from '../../../util/getBuildingProvisionsAndProduction';
import { formatResourceName } from '../../../util/formatResourceName';

interface TableRowData {
  id: number | string;
  name: string;
  type: string;
  width: number;
  length: number;
  level: number;
  chapter: number | undefined;
  stage?: number;
  provisions: Record<string, number>;
  production: Record<string, number>;
}

type Order = 'asc' | 'desc';

export const TableCityView = () => {
  const city = useCity();
  const { blocks, race, searchTerm } = city;
  const [tableData, setTableData] = React.useState<TableRowData[]>([]);
  const [allResourceKeys, setAllResourceKeys] = React.useState<string[]>([]);
  const [showPerSquare, setShowPerSquare] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);

  // Sorting State
  const [orderBy, setOrderBy] = React.useState<string>('name');
  const [order, setOrder] = React.useState<Order>('asc');

  React.useEffect(() => {
    async function buildData() {
      const finder = new BuildingFinder();
      await finder.ensureInitialized();

      const blockValues = Object.values(blocks);

      const computedRows: TableRowData[] = [];
      const keysSet = new Set<string>();

      for (const block of blockValues) {
        // Exclude streets, residences, workshops and armories
        if (/^[SRPO]_/.test(block.gameId)) continue;
        // Exclude ancient wonders
        if (block.entity.type === 'ancient_wonder') continue;

        const building = finder.getBuilding(block.gameId, block.level);
        const name = building ? building.name : block.name;

        const row: TableRowData = {
          id: block.id,
          name: name,
          type: block.type,
          width: block.width,
          length: block.length,
          level: block.level,
          chapter: block.chapter,
          stage: block.stage,
          provisions: {},
          production: {},
        };

        if (building) {
          // A. Provisions (Static)
          const { provisions, production } = getBuildingProvisionsAndProduction(
            building,
            keysSet,
            city.evolvingBuildings,
            block.stage,
          );
          row.provisions = provisions;
          row.production = production;
        }

        if (Object.keys(row.provisions).length === 0 && Object.keys(row.production).length === 0) continue;

        computedRows.push(row);
      }

      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const priority = ['population', 'culture', 'money', 'supplies'];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      setTableData(computedRows);
      setAllResourceKeys(sortedKeys);
    }
    void buildData();
  }, [blocks, race]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    if (orderBy === property) {
      setOrder(isAsc ? 'desc' : 'asc');
    } else {
      // Name defaults to ascending, all others default to descending (quantities/levels)
      setOrder(property === 'name' ? 'asc' : 'desc');
    }
    setOrderBy(property);
  };

  const filteredRows = React.useMemo(() => {
    if (!searchTerm) return tableData;

    let matcher: (row: TableRowData) => boolean;
    if (searchTerm.length > 2 && searchTerm.startsWith('/') && searchTerm.endsWith('/')) {
      // Regex mode
      try {
        const regex = new RegExp(searchTerm.slice(1, -1), 'i');
        matcher = (row: TableRowData) => regex.test(row.name) || regex.test(row.type);
      } catch {
        return []; // Invalid regex returns no results
      }
    } else if (/^\d+x\d*|\d*x\d+$/.test(searchTerm)) {
      matcher = (row: TableRowData) => `${row.width}x${row.length}`.includes(searchTerm);
    } else {
      matcher = (row: TableRowData) =>
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.type.toLowerCase().includes(searchTerm.toLowerCase());
    }

    return tableData.filter(matcher);
  }, [tableData, searchTerm]);

  const sortedRows = React.useMemo(() => {
    const comparator = (a: TableRowData, b: TableRowData) => {
      let aValue: number | string;
      let bValue: number | string;

      if (orderBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (orderBy === 'chapter') {
        aValue = a.chapter || -1;
        bValue = b.chapter || -1;
      } else if (orderBy === 'size') {
        aValue = a.width * a.length;
        bValue = b.width * b.length;
      } else {
        // Resource columns
        const getResourceVal = (r: TableRowData) => {
          const rawVal = (r.provisions[orderBy] || 0) + (r.production[orderBy] || 0);
          if (showPerSquare) {
            return rawVal / (r.width * r.length);
          }
          return rawVal;
        };
        aValue = getResourceVal(a);
        bValue = getResourceVal(b);
      }

      if (aValue < bValue) {
        return -1;
      }
      if (aValue > bValue) {
        return 1;
      }
      return 0;
    };

    return [...filteredRows].sort((a, b) => {
      return order === 'desc' ? -comparator(a, b) : comparator(a, b);
    });
  }, [filteredRows, order, orderBy, showPerSquare]);

  const handleCopyToClipboard = () => {
    // 1. Prepare Headers
    const headers = [
      'Name',
      'Chapter',
      'Size',
      ...allResourceKeys.map(
        (k) => `${formatResourceName(city.goodsNames, city.boostedGoods, k)}${showPerSquare ? '/sq' : ''}`,
      ),
    ];

    // 2. Prepare Rows
    const rows = sortedRows.map((row) => {
      const name = `${row.name}${row.stage ? ` (Stage ${row.stage})` : ''}`;
      const chapter = row.chapter ? String(row.chapter) : '-';
      const size = `${row.width}x${row.length}`;

      const resCols = allResourceKeys.map((key) => {
        const provVal = row.provisions[key];
        const prodVal = row.production[key];

        const val = (provVal || 0) + (prodVal || 0);

        if (val > 0) {
          const num = showPerSquare ? val / (row.width * row.length) : val;
          // Format for clipboard (US locale for consistent decimals, no grouping for parsing)
          return num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: showPerSquare ? 1 : 0,
            useGrouping: false,
          });
        }
        return '';
      });

      return [name, chapter, size, ...resCols].join('\t');
    });

    // 3. Combine
    const textData = [headers.join('\t'), ...rows].join('\n');

    // 4. Copy to Clipboard
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
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottom: 1,
          borderColor: 'divider',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <FormControlLabel
          control={<Switch checked={showPerSquare} onChange={(e) => setShowPerSquare(e.target.checked)} size='small' />}
          label={<span style={{ fontSize: '0.875rem' }}>Show per square</span>}
        />
        <Button variant='outlined' startIcon={<ContentCopyIcon />} onClick={handleCopyToClipboard} size='small'>
          Copy Table
        </Button>
      </Box>
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table stickyHeader size='small' aria-label='city entities table'>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell align='right'>
                <TableSortLabel
                  active={orderBy === 'chapter'}
                  direction={orderBy === 'chapter' ? order : 'desc'}
                  onClick={() => handleRequestSort('chapter')}
                >
                  Chapter
                </TableSortLabel>
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
              {allResourceKeys.map((key) => (
                <TableCell key={key} align='right'>
                  <TableSortLabel
                    active={orderBy === key}
                    direction={orderBy === key ? order : 'desc'}
                    onClick={() => handleRequestSort(key)}
                  >
                    {formatResourceName(city.goodsNames, city.boostedGoods, key)}
                    {showPerSquare ? '/sq' : ''}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((row, idx) => (
              <TableRow key={`${row.id}-${idx}`} hover>
                <TableCell component='th' scope='row' sx={{ fontWeight: 500 }}>
                  {row.name} {row.stage ? `(Stage ${row.stage})` : ''}
                </TableCell>
                <TableCell align='right'>{row.chapter ?? '-'}</TableCell>
                <TableCell align='center'>
                  {row.width}x{row.length}
                </TableCell>
                {allResourceKeys.map((key) => {
                  const provVal = row.provisions[key];
                  const prodVal = row.production[key];

                  const val = (provVal || 0) + (prodVal || 0);

                  let displayVal = '-';

                  if (val > 0) {
                    const num = showPerSquare ? val / (row.width * row.length) : val;
                    displayVal = `${num.toLocaleString(undefined, { maximumFractionDigits: showPerSquare ? 1 : 0 })}`;
                  }

                  return (
                    <TableCell key={key} align='right'>
                      {displayVal}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        message='Table copied to clipboard'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
};
