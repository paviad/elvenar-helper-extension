import React from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { ENCOUNTERS_PER_PROVINCE, Province, PROVINCE_STATUS_LABELS, PROVINCE_STATUSES } from './deriveWorldMap';
import { compassBearing, Hex } from './worldMapGeometry';
import { DIFFICULTY_LABELS, formatDuration, GOOD_COLOURS, goodName } from './worldMapStyle';

type SortKey = 'good' | 'status' | 'done' | 'distance' | 'cost' | 'time' | 'difficulty';

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'good', label: 'Good' },
  { key: 'status', label: 'State' },
  { key: 'done', label: 'Encounters', numeric: true },
  { key: 'distance', label: 'Distance', numeric: true },
  { key: 'cost', label: 'Scout cost', numeric: true },
  { key: 'time', label: 'Scout time', numeric: true },
  { key: 'difficulty', label: 'Difficulty' },
];

const ROWS_PER_PAGE = 50;

interface WorldMapTableProps {
  /** The player's city, which the direction arrows point away from. */
  home: Hex;
  /** The provinces that pass the filters. */
  provinces: Province[];
  goodsNames: Record<string, string>;
  now: number;
  /** Asked for a province's menu, by a right click on its row, at this spot of the page. */
  onProvinceMenu?: (province: Province, x: number, y: number) => void;
}

export const WorldMapTable = ({ home, provinces, goodsNames, now, onProvinceMenu }: WorldMapTableProps) => {
  const [sortKey, setSortKey] = React.useState<SortKey>('distance');
  const [ascending, setAscending] = React.useState(true);
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    const value = (p: Province): number | string => {
      switch (sortKey) {
        case 'good':
          return goodName(goodsNames, p.good);
        case 'status':
          return PROVINCE_STATUSES.indexOf(p.status);
        default:
          // A province with no scouting figures sorts after those that have them, either way up.
          return p[sortKey] ?? (ascending ? Infinity : -Infinity);
      }
    };
    const direction = ascending ? 1 : -1;
    return [...provinces].sort((a, b) => {
      const [va, vb] = [value(a), value(b)];
      const order = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
      return order * direction || a.distance - b.distance;
    });
  }, [provinces, goodsNames, sortKey, ascending]);

  // A filter can leave fewer pages than the one being shown.
  const lastPage = Math.max(0, Math.ceil(sorted.length / ROWS_PER_PAGE) - 1);
  const shownPage = Math.min(page, lastPage);

  const sortBy = (key: SortKey) => {
    setAscending(key === sortKey ? !ascending : true);
    setSortKey(key);
    setPage(0);
  };

  return (
    <Paper variant='outlined'>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell key={column.key} align={column.numeric ? 'right' : 'left'}>
                  <TableSortLabel
                    active={sortKey === column.key}
                    direction={sortKey === column.key && !ascending ? 'desc' : 'asc'}
                    onClick={() => sortBy(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.slice(shownPage * ROWS_PER_PAGE, (shownPage + 1) * ROWS_PER_PAGE).map((p) => (
              <TableRow
                key={p.key}
                hover
                onContextMenu={
                  onProvinceMenu &&
                  ((event: React.MouseEvent) => {
                    event.preventDefault();
                    onProvinceMenu(p, event.clientX, event.clientY);
                  })
                }
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: GOOD_COLOURS[p.good] }} />
                    {goodName(goodsNames, p.good)}
                  </Box>
                </TableCell>
                <TableCell>
                  {PROVINCE_STATUS_LABELS[p.status]}
                  {p.endsAt !== undefined && ` (${formatDuration(Math.max(0, p.endsAt - now) / 1000)} left)`}
                </TableCell>
                <TableCell align='right'>
                  {p.status === 'completed' || p.status === 'incomplete' ? `${p.done}/${ENCOUNTERS_PER_PROVINCE}` : ''}
                </TableCell>
                <TableCell align='right'>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <ArrowUpwardIcon
                      sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        transform: `rotate(${compassBearing(home, p)}deg)`,
                      }}
                    />
                    {p.distance}
                  </Box>
                </TableCell>
                <TableCell align='right'>{p.cost?.toLocaleString() ?? ''}</TableCell>
                <TableCell align='right'>{p.time === undefined ? '' : formatDuration(p.time)}</TableCell>
                <TableCell>{p.difficulty ? (DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty) : ''}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} align='center' sx={{ color: 'text.secondary', py: 3 }}>
                  No provinces match the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={sorted.length}
        page={shownPage}
        onPageChange={(_, next) => setPage(next)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
      />
    </Paper>
  );
};
