import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { formatResourceName } from '../../../util/formatResourceName';
import { getBuildingProvisionsAndProduction } from '../../../util/getBuildingProvisionsAndProduction';
import { useTabStore } from '../../../util/tabStore';
import { getBuildingFinder } from '../../buildingFinder';
import { getChapterProgress } from '../../chapterProgress';
import { useCity } from '../../CityContext';

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
  isMaxed: boolean;
  nextWidth?: number;
  nextLength?: number;
  nextProvisions?: Record<string, number>;
  nextProduction?: Record<string, number>;
}

type Order = 'asc' | 'desc';

export const TableCityView = () => {
  const city = useCity();
  const { blocks, race, searchTerm } = city;
  const [tableData, setTableData] = React.useState<TableRowData[]>([]);
  const [allResourceKeys, setAllResourceKeys] = React.useState<string[]>([]);

  const showPerSquare = useTabStore((state) => state.showPerSquare);
  const setShowPerSquare = useTabStore((state) => state.setShowPerSquare);

  const showUpgrades = useTabStore((state) => state.showUpgrades);
  const setShowUpgrades = useTabStore((state) => state.setShowUpgrades);

  const orderBy = useTabStore((state) => state.tableOrderBy);
  const setOrderBy = useTabStore((state) => state.setTableOrderBy);

  const order = useTabStore((state) => state.tableOrder);
  const setOrder = useTabStore((state) => state.setTableOrder);

  const [toastOpen, setToastOpen] = React.useState(false);
  React.useEffect(() => {
    async function buildData() {
      const finder = getBuildingFinder();
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
          isMaxed: true,
        };

        if (building) {
          // A. Current Provisions & Production
          const { provisions, production } = getBuildingProvisionsAndProduction(
            building,
            keysSet,
            city.evolvingBuildings,
            block.stage,
          );
          row.provisions = provisions;
          row.production = production;

          // B. Next Level/Chapter Provisions & Production
          const nextBuilding = finder.getBuilding(block.gameId, block.level + 1);
          row.isMaxed = getChapterProgress(block.gameId, building, nextBuilding, city.chapter).isMaxedForChapter;
          if (nextBuilding) {
            row.nextWidth = nextBuilding.width;
            row.nextLength = nextBuilding.length;

            const nextResult = getBuildingProvisionsAndProduction(
              nextBuilding,
              keysSet,
              city.evolvingBuildings,
              block.stage,
            );
            row.nextProvisions = nextResult.provisions;
            row.nextProduction = nextResult.production;
          }
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
  }, [blocks, race, city.evolvingBuildings, city.chapter]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    if (orderBy === property) {
      setOrder(isAsc ? 'desc' : 'asc');
    } else {
      // Name defaults to ascending, all others default to descending
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
      // Push maxed buildings to the bottom if showUpgrades is active
      if (showUpgrades) {
        if (a.isMaxed && !b.isMaxed) return order === 'asc' ? 1 : -1;
        if (!a.isMaxed && b.isMaxed) return order === 'asc' ? -1 : 1;
      }

      // Push 1xN or Nx1 buildings to the bottom if sorting by a resource other than population
      const isResourceColumn = !['name', 'chapter', 'size'].includes(orderBy);
      if (isResourceColumn && orderBy !== 'population') {
        const aIsUnhelpable = a.width === 1 || a.length === 1;
        const bIsUnhelpable = b.width === 1 || b.length === 1;

        if (aIsUnhelpable && !bIsUnhelpable) return order === 'asc' ? 1 : -1;
        if (!aIsUnhelpable && bIsUnhelpable) return order === 'asc' ? -1 : 1;
      }

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
          const oldVal = (r.provisions[orderBy] || 0) + (r.production[orderBy] || 0);
          const oldArea = r.width * r.length;

          if (showUpgrades) {
            if (r.isMaxed) return Number.MIN_SAFE_INTEGER;

            const newVal = (r.nextProvisions?.[orderBy] || 0) + (r.nextProduction?.[orderBy] || 0);
            const newArea = (r.nextWidth || r.width) * (r.nextLength || r.length);

            if (showPerSquare) {
              return newVal / newArea - oldVal / oldArea;
            }
            return newVal - oldVal;
          } else {
            if (showPerSquare) {
              return oldVal / oldArea;
            }
            return oldVal;
          }
        };

        aValue = getResourceVal(a);
        bValue = getResourceVal(b);
      }

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    };

    return [...filteredRows].sort((a, b) => {
      return order === 'desc' ? -comparator(a, b) : comparator(a, b);
    });
  }, [filteredRows, order, orderBy, showPerSquare, showUpgrades]);

  const handleCopyToClipboard = () => {
    // 1. Prepare Headers
    const headers = [
      'Name',
      'Chapter',
      'Size',
      ...allResourceKeys.map(
        (k) =>
          `${formatResourceName(city.goodsNames, city.boostedGoods, k)}${showPerSquare ? '/sq' : ''}${showUpgrades ? ' (Upgrade Delta)' : ''}`,
      ),
    ];

    // 2. Prepare Rows
    const rows = sortedRows.map((row) => {
      const name = `${row.name}${row.stage ? ` (Stage ${row.stage})` : ''}`;
      const chapter = row.chapter ? String(row.chapter) : '-';

      let size = `${row.width}x${row.length}`;
      if (showUpgrades && !row.isMaxed && (row.width !== row.nextWidth || row.length !== row.nextLength)) {
        size = `${row.width}x${row.length} -> ${row.nextWidth}x${row.nextLength}`;
      }

      const resCols = allResourceKeys.map((key) => {
        const oldVal = (row.provisions[key] || 0) + (row.production[key] || 0);

        if (showUpgrades) {
          if (row.isMaxed) return oldVal > 0 ? 'Maxed' : '';

          const newVal = (row.nextProvisions?.[key] || 0) + (row.nextProduction?.[key] || 0);
          if (oldVal > 0 || newVal > 0) {
            const oldArea = row.width * row.length;
            const newArea = (row.nextWidth || row.width) * (row.nextLength || row.length);
            const delta = showPerSquare ? newVal / newArea - oldVal / oldArea : newVal - oldVal;

            if (Math.abs(delta) < 0.001) return '0';

            return delta.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: showPerSquare ? 1 : 0,
              useGrouping: false,
            });
          }
          return '';
        } else {
          if (oldVal > 0) {
            const num = showPerSquare ? oldVal / (row.width * row.length) : oldVal;
            return num.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: showPerSquare ? 1 : 0,
              useGrouping: false,
            });
          }
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

  const onChangeShowUpgrades = (e: React.ChangeEvent<HTMLInputElement, Element>): void => {
    if (e.target.checked) {
      setShowPerSquare(true);
    }
    setShowUpgrades(e.target.checked);
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
          control={<Switch checked={showUpgrades} onChange={onChangeShowUpgrades} size='small' color='secondary' />}
          label={
            <span style={{ fontSize: '0.875rem', fontWeight: showUpgrades ? 'bold' : 'normal' }}>Show Upgrades</span>
          }
        />
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
                  {showUpgrades && !row.isMaxed && (row.width !== row.nextWidth || row.length !== row.nextLength) ? (
                    <Box component='span' sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                      {row.width}x{row.length} ➔ {row.nextWidth}x{row.nextLength}
                    </Box>
                  ) : (
                    `${row.width}x${row.length}`
                  )}
                </TableCell>
                {allResourceKeys.map((key) => {
                  const oldVal = (row.provisions[key] || 0) + (row.production[key] || 0);
                  let displayNode: React.ReactNode = '-';

                  if (showUpgrades) {
                    if (row.isMaxed) {
                      displayNode =
                        oldVal > 0 ? (
                          <Box
                            component='span'
                            sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.75rem' }}
                          >
                            Maxed
                          </Box>
                        ) : (
                          '-'
                        );
                    } else {
                      const newVal = (row.nextProvisions?.[key] || 0) + (row.nextProduction?.[key] || 0);
                      if (oldVal > 0 || newVal > 0) {
                        const oldArea = row.width * row.length;
                        const newArea = (row.nextWidth || row.width) * (row.nextLength || row.length);
                        const delta = showPerSquare ? newVal / newArea - oldVal / oldArea : newVal - oldVal;

                        if (Math.abs(delta) < 0.001) {
                          displayNode = '0';
                        } else {
                          const isPositive = delta > 0;
                          const color = isPositive ? 'success.main' : 'error.main';
                          const sign = isPositive ? '+' : '';
                          displayNode = (
                            <Box component='span' sx={{ color, fontWeight: 'bold' }}>
                              {sign}
                              {delta.toLocaleString(undefined, { maximumFractionDigits: showPerSquare ? 1 : 0 })}
                            </Box>
                          );
                        }
                      }
                    }
                  } else {
                    if (oldVal > 0) {
                      const num = showPerSquare ? oldVal / (row.width * row.length) : oldVal;
                      displayNode = num.toLocaleString(undefined, { maximumFractionDigits: showPerSquare ? 1 : 0 });
                    }
                  }

                  return (
                    <TableCell key={key} align='right'>
                      {displayNode}
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
