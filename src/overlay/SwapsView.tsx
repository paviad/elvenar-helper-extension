import React, { useEffect, useMemo, useState } from 'react';
import HistoryIcon from '@mui/icons-material/History';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Avatar, Box, Button, Checkbox, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { getBuildingFinder } from '../city/buildingFinder';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { MessagesData } from '../model/gameMessage';
import { SwapEntry, swapPaidKey, SwapTally } from '../model/kpSwap';
import { ensureMinWidthAndHeight } from '../overlay';
import {
  authorType,
  bodyType,
  engravedRule,
  gild,
  gildedAvatar,
  gildedBar,
  plaqueBand,
  plaqueFace,
  timestampType,
} from './gild';
import { computeSwapTally } from './kpSwaps/computeSwapTally';
import { getAccountId, getOverlayStore } from './overlayStore';

interface AccountSnapshot {
  messagesData?: MessagesData;
  playerId?: number;
}

/** One player's outstanding debt, summed across however many threads it came from. */
interface PlayerTotal {
  name: string;
  threads: number;
  amount: number;
}

function playerTotals(entries: SwapEntry[]): PlayerTotal[] {
  const totals = new Map<number, PlayerTotal>();
  for (const entry of entries) {
    const existing = totals.get(entry.recipientPlayerId);
    if (existing) {
      existing.threads += 1;
      existing.amount += entry.amount;
    } else {
      totals.set(entry.recipientPlayerId, { name: entry.recipientName, threads: 1, amount: entry.amount });
    }
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

const centered = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  background: gild.parchment,
  color: gild.bronzeSoft,
  gap: 1,
  p: 4,
  textAlign: 'center',
} as const;

export const SwapsView = () => {
  const overlayStore = getOverlayStore();
  const messagesUpdate = overlayStore((state) => state.messagesUpdate);
  const messagesDetailsReceived = overlayStore((state) => state.messagesDetailsReceived);
  const paidSwaps = overlayStore((state) => state.paidSwaps);
  const setPaidSwaps = overlayStore((state) => state.setPaidSwaps);

  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [wonderNames, setWonderNames] = useState<string[] | null>(null);

  useEffect(() => {
    ensureMinWidthAndHeight(400, 600);
  }, []);

  // The wonder catalog is immutable for the life of the page, so this runs once.
  useEffect(() => {
    async function loadWonders() {
      const finder = getBuildingFinder();
      try {
        await finder.ensureInitialized();
        setWonderNames(finder.getAncientWonders().map((w) => w.name));
      } catch {
        setWonderNames([]);
      }
    }
    void loadWonders();
  }, []);

  useEffect(() => {
    async function loadAccount() {
      const accountId = getAccountId();
      if (!accountId) {
        setAccount({});
        return;
      }
      await loadSingleAccountFromStorage(accountId, true);
      const data = getAccountById(accountId);
      setAccount({ messagesData: data?.messagesData, playerId: data?.cityQuery?.userData?.player_id });
    }
    void loadAccount();
  }, [messagesUpdate]);

  const tally: SwapTally = useMemo(
    () => computeSwapTally(account?.messagesData, wonderNames ?? [], account?.playerId),
    [account, wonderNames],
  );

  const paid = useMemo(() => new Set(paidSwaps), [paidSwaps]);
  const outstanding = useMemo(() => tally.entries.filter((e) => !paid.has(swapPaidKey(e))), [tally, paid]);
  const totals = useMemo(() => playerTotals(outstanding), [outstanding]);
  const totalKp = outstanding.reduce((sum, e) => sum + e.amount, 0);

  // Ticking also drops any key that no longer matches a live row, so posting the next round
  // in a thread clears out its old key instead of leaving it to accumulate in storage.
  const setPaid = (keys: Set<string>) => {
    const live = new Set(tally.entries.map(swapPaidKey));
    setPaidSwaps([...keys].filter((k) => live.has(k)));
  };

  const togglePaid = (entry: SwapEntry) => {
    const key = swapPaidKey(entry);
    const next = new Set(paid);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setPaid(next);
  };

  const clearAll = () => setPaid(new Set(tally.entries.map(swapPaidKey)));

  if (account === null || wonderNames === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Without the catalog there is no way to tell a request post from any other post.
  if (wonderNames.length === 0) {
    return (
      <Box sx={{ ...centered }}>
        <SwapHorizIcon fontSize='large' />
        <Typography variant='body2'>
          The list of ancient wonders hasn&apos;t been captured yet. Open your city in the game once, then come back.
        </Typography>
      </Box>
    );
  }

  const stale = !messagesDetailsReceived && tally.entries.length + tally.skipped.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ px: 1.5, py: 1, ...gildedBar, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SwapHorizIcon fontSize='small' sx={{ color: gild.bronze }} />
        <Typography sx={{ fontFamily: gild.serif, fontWeight: 700, color: gild.ink, flex: 1 }}>
          {outstanding.length === 0 ? 'Nothing to repay' : `${outstanding.length} to repay · ${totalKp} KP`}
        </Typography>
        {tally.entries.length > 0 && outstanding.length > 0 && (
          <Button size='small' onClick={clearAll} sx={{ color: gild.bronze, fontSize: 12 }}>
            Clear all
          </Button>
        )}
      </Box>

      {stale && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            bgcolor: '#fff8e1',
            color: '#8a6d00',
            borderBottom: '1px solid',
            borderColor: '#f0e0a0',
          }}
        >
          <HistoryIcon fontSize='small' />
          <Typography variant='caption' sx={{ lineHeight: 1.3 }}>
            Saved view — may be out of date. Open Messages in the game to refresh.
          </Typography>
        </Box>
      )}

      {tally.entries.length === 0 && tally.skipped.length === 0 ? (
        <Box sx={{ ...centered }}>
          <SwapHorizIcon fontSize='large' />
          <Typography variant='body2'>
            Post “&lt;Ancient Wonder&gt; please” in a KP swap thread and whoever posted before you shows up here, with
            the amount from the thread title.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0, background: gild.parchment, p: 1.5 }}>
          {totals.length > 0 && (
            <Box sx={{ ...plaqueBand, mb: 1.5 }}>
              <Box sx={{ ...plaqueFace() }}>
                <Typography sx={{ ...authorType }}>Give to</Typography>
                <Box aria-hidden sx={{ ...engravedRule }} />
                <Stack spacing={0.5}>
                  {totals.map((total) => (
                    <Stack key={total.name} direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
                      <Typography sx={{ ...bodyType, flex: 1, minWidth: 0 }} noWrap>
                        {total.name}
                      </Typography>
                      {total.threads > 1 && <Typography sx={{ ...timestampType }}>{total.threads} threads</Typography>}
                      <Typography sx={{ ...authorType, fontVariantNumeric: 'tabular-nums' }}>
                        {total.amount} KP
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Box>
          )}

          <Stack spacing={1.25}>
            {tally.entries.map((entry) => (
              <SwapRow
                key={swapPaidKey(entry)}
                entry={entry}
                paid={paid.has(swapPaidKey(entry))}
                onToggle={() => togglePaid(entry)}
              />
            ))}
          </Stack>

          {tally.skipped.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ borderColor: gild.mid, mb: 1 }} />
              <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <ReportProblemOutlinedIcon fontSize='small' sx={{ color: '#8a6d00' }} />
                <Typography variant='caption' sx={{ color: '#8a6d00' }}>
                  Not counted — no amount could be read from the title
                </Typography>
              </Stack>
              {tally.skipped.map((skip) => (
                <Typography key={skip.threadId} variant='caption' sx={{ color: gild.bronzeSoft, display: 'block' }}>
                  {skip.subject} — you owe {skip.recipientName}
                  {skip.ambiguous ? ' (the title names more than one amount)' : ''}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

interface SwapRowProps {
  entry: SwapEntry;
  paid: boolean;
  onToggle: () => void;
}

const SwapRow = ({ entry, paid, onToggle }: SwapRowProps) => (
  <Stack direction='row' spacing={1.25} sx={{ alignItems: 'flex-start', opacity: paid ? 0.45 : 1 }}>
    <Avatar sx={{ ...gildedAvatar }} title={entry.recipientName}>
      {entry.recipientName[0]}
    </Avatar>
    <Box sx={{ ...plaqueBand, flex: 1, minWidth: 0 }}>
      <Box sx={{ ...plaqueFace() }}>
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component='span' sx={{ ...authorType, flex: 1, minWidth: 0 }} noWrap>
            {entry.recipientName}
          </Typography>
          <Chip
            size='small'
            label={`${entry.amount} KP`}
            sx={{
              height: 20,
              fontWeight: 700,
              color: gild.bronze,
              borderColor: gild.mid,
              bgcolor: 'rgba(255, 253, 246, 0.8)',
              textDecoration: paid ? 'line-through' : 'none',
            }}
            variant='outlined'
          />
          <Checkbox
            size='small'
            checked={paid}
            onChange={onToggle}
            slotProps={{ input: { 'aria-label': `Mark ${entry.amount} KP to ${entry.recipientName} as given` } }}
            sx={{ p: 0.25, color: gild.mid, '&.Mui-checked': { color: gild.deep } }}
          />
        </Stack>
        <Box aria-hidden sx={{ ...engravedRule }} />
        <Typography align='left' sx={{ ...bodyType }}>
          {entry.recipientPost}
        </Typography>
        <Typography sx={{ ...timestampType, display: 'block', mt: 0.5 }} noWrap>
          {entry.subject} · you asked for {entry.requestedWonder}
        </Typography>
      </Box>
    </Box>
  </Stack>
);
