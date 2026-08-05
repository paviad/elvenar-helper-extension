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
import { groupSwapsByPayee, PayeeGroup } from './kpSwaps/groupSwapsByPayee';
import { getAccountId, getOverlayStore } from './overlayStore';

interface AccountSnapshot {
  messagesData?: MessagesData;
  playerId?: number;
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
  const swapsClearedAt = overlayStore((state) => state.swapsClearedAt);
  const setSwapsClearedAt = overlayStore((state) => state.setSwapsClearedAt);

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

  // Until the watermark has been established, Infinity keeps every existing round out of the
  // list — so it never flashes your whole swap history on first open.
  const tally: SwapTally = useMemo(
    () => computeSwapTally(account?.messagesData, wonderNames ?? [], account?.playerId, swapsClearedAt ?? Infinity),
    [account, wonderNames, swapsClearedAt],
  );

  // First run on this account: adopt whatever your newest request post is, so the list starts
  // empty and only fills as you post from here on.
  useEffect(() => {
    if (swapsClearedAt === undefined && account !== null && wonderNames !== null) {
      setSwapsClearedAt(tally.latestRequestAt || Math.floor(Date.now() / 1000));
    }
  }, [swapsClearedAt, account, wonderNames, tally.latestRequestAt]);

  const paid = useMemo(() => new Set(paidSwaps), [paidSwaps]);
  // Grouped from the full list, not just the unpaid ones, so a payee keeps their place in the
  // list as you tick their threads off instead of jumping about under the cursor.
  const groups = useMemo(() => groupSwapsByPayee(tally.entries), [tally]);
  const outstanding = useMemo(() => tally.entries.filter((e) => !paid.has(swapPaidKey(e))), [tally, paid]);
  const payeesLeft = new Set(outstanding.map((e) => e.recipientPlayerId)).size;

  // Ticking also drops any key that no longer matches a live row, so posting the next round
  // in a thread clears out its old key instead of leaving it to accumulate in storage.
  const setPaid = (keys: Set<string>) => {
    const live = new Set(tally.entries.map(swapPaidKey));
    setPaidSwaps([...keys].filter((k) => live.has(k)));
  };

  const togglePaid = (entries: SwapEntry[], nextPaid: boolean) => {
    const next = new Set(paid);
    for (const entry of entries) {
      if (nextPaid) {
        next.add(swapPaidKey(entry));
      } else {
        next.delete(swapPaidKey(entry));
      }
    }
    setPaid(next);
  };

  // Clearing moves the watermark past every round on show, so they never come back — and,
  // unlike ticking rows off, it does not depend on us knowing whether you actually repaid.
  const clearAll = () => {
    setSwapsClearedAt(Math.max(swapsClearedAt ?? 0, tally.latestRequestAt));
    setPaidSwaps([]);
  };

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
        {/* Deliberately just a label: the numbers that matter are the per-payee ones on each
            card, which are what you actually act on. */}
        <Typography sx={{ fontFamily: gild.serif, fontWeight: 700, color: gild.ink, flex: 1 }}>
          {payeesLeft === 0 ? 'Nothing to repay' : 'To repay'}
        </Typography>
        {tally.entries.length > 0 && (
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
            Nothing owed. Post “&lt;Ancient Wonder&gt; please” in a KP swap thread and whoever posted before you shows
            up here, with the amount from the thread title. Repay them, then hit Clear all to empty the list again.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0, background: gild.parchment, p: 1.5 }}>
          <Stack spacing={1.25}>
            {groups.map((group) => (
              <PayeeCard
                key={group.playerId}
                group={group}
                paid={paid}
                onToggleGroup={(nextPaid) => togglePaid(group.entries, nextPaid)}
                onToggleEntry={(entry, nextPaid) => togglePaid([entry], nextPaid)}
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

interface PayeeCardProps {
  group: PayeeGroup;
  paid: Set<string>;
  onToggleGroup: (nextPaid: boolean) => void;
  onToggleEntry: (entry: SwapEntry, nextPaid: boolean) => void;
}

// One card per person to repay. The header carries what you owe them in total — that is the
// number you act on — and the rows beneath break it down per thread, since each thread has
// its own amount and may name a different wonder.
const PayeeCard = ({ group, paid, onToggleGroup, onToggleEntry }: PayeeCardProps) => {
  const paidCount = group.entries.filter((e) => paid.has(swapPaidKey(e))).length;
  const allPaid = paidCount === group.entries.length;
  const owed = group.entries.filter((e) => !paid.has(swapPaidKey(e))).reduce((sum, e) => sum + e.amount, 0);

  return (
    <Stack direction='row' spacing={1.25} sx={{ alignItems: 'flex-start', opacity: allPaid ? 0.45 : 1 }}>
      <Avatar sx={{ ...gildedAvatar }} title={group.name}>
        {group.name[0]}
      </Avatar>
      <Box sx={{ ...plaqueBand, flex: 1, minWidth: 0 }}>
        <Box sx={{ ...plaqueFace() }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <Typography component='span' sx={{ ...authorType, flex: 1, minWidth: 0 }} noWrap>
              {group.name}
            </Typography>
            <Chip
              size='small'
              label={`${allPaid ? group.total : owed} KP`}
              sx={{
                height: 20,
                fontWeight: 700,
                color: gild.bronze,
                borderColor: gild.mid,
                bgcolor: 'rgba(255, 253, 246, 0.8)',
                textDecoration: allPaid ? 'line-through' : 'none',
              }}
              variant='outlined'
            />
            <Checkbox
              size='small'
              checked={allPaid}
              indeterminate={paidCount > 0 && !allPaid}
              onChange={() => onToggleGroup(!allPaid)}
              slotProps={{ input: { 'aria-label': `Mark everything owed to ${group.name} as given` } }}
              sx={{
                p: 0.25,
                color: gild.mid,
                '&.Mui-checked': { color: gild.deep },
                '&.MuiCheckbox-indeterminate': { color: gild.deep },
              }}
            />
          </Stack>

          <Box aria-hidden sx={{ ...engravedRule }} />

          <Stack spacing={0.75}>
            {group.entries.map((entry) => {
              const entryPaid = paid.has(swapPaidKey(entry));
              return (
                <Box key={swapPaidKey(entry)} sx={{ opacity: !allPaid && entryPaid ? 0.5 : 1 }}>
                  <Stack direction='row' spacing={1} sx={{ alignItems: 'flex-start' }}>
                    {/* Per-thread ticks only earn their place when there is more than one. */}
                    {group.entries.length > 1 && (
                      <Checkbox
                        size='small'
                        checked={entryPaid}
                        onChange={() => onToggleEntry(entry, !entryPaid)}
                        slotProps={{
                          input: {
                            'aria-label': `Mark ${entry.amount} KP to ${group.name} for ${entry.subject} as given`,
                          },
                        }}
                        sx={{ p: 0, mt: 0.25, color: gild.mid, '&.Mui-checked': { color: gild.deep } }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
                        <Typography
                          sx={{
                            ...authorType,
                            fontSize: 13,
                            fontVariantNumeric: 'tabular-nums',
                            textDecoration: entryPaid ? 'line-through' : 'none',
                          }}
                        >
                          {entry.amount} KP
                        </Typography>
                        <Typography align='left' sx={{ ...bodyType, fontSize: 13, flex: 1, minWidth: 0 }}>
                          {entry.recipientPost}
                        </Typography>
                      </Stack>
                      <Typography sx={{ ...timestampType, display: 'block' }} noWrap>
                        {entry.subject} · you asked for {entry.requestedWonder}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
};
