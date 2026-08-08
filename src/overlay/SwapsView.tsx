import React, { useEffect, useMemo, useRef, useState } from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { AncientWonder, getBuildingFinder } from '../city/buildingFinder';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { CityEntity } from '../model/cityEntity';
import { MessagesData } from '../model/gameMessage';
import { SwapEntry, swapPaidKey, SwapTally } from '../model/kpSwap';
import { WonderKp, wonderKpRemaining } from '../model/wonderKp';
import { ensureMinWidthAndHeight, expandPanel } from '../overlay';
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
import { applySwapBudgets, seedSwapBudget } from './kpSwaps/applySwapBudgets';
import { computeSwapTally } from './kpSwaps/computeSwapTally';
import { getOwnedWonders } from './kpSwaps/getOwnedWonders';
import { groupSwapsByPayee, PayeeGroup } from './kpSwaps/groupSwapsByPayee';
import { getAccountId, getOverlayStore } from './overlayStore';

interface AccountSnapshot {
  messagesData?: MessagesData;
  playerId?: number;
  cityEntities?: CityEntity[];
  wonderKp?: WonderKp[];
}

// The exact-match rule means a typo posts a message that quietly does nothing, so the request
// text is copied rather than typed. navigator.clipboard is the modern path; the textarea
// fallback covers the odd context where it is unavailable.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const scratch = document.createElement('textarea');
      scratch.value = text;
      scratch.style.position = 'fixed';
      scratch.style.opacity = '0';
      document.body.appendChild(scratch);
      scratch.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(scratch);
      return ok;
    } catch {
      return false;
    }
  }
}

const requestTextFor = (wonderName: string) => `${wonderName} please`;

/** How long the "Copied" tick shows before the popover dismisses itself. */
const COPIED_DISMISS_MS = 500;

/**
 * Inside the panel's stacking context the popover already sits above the page, so this is only
 * about its siblings there — chiefly the resize handle `overlay.ts` puts at 10000, which would
 * otherwise take the clicks in the bottom-right corner.
 */
const OVERLAY_POPOVER_Z_INDEX = 10001;

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
  const swapBudgets = overlayStore((state) => state.swapBudgets);
  const setSwapBudgets = overlayStore((state) => state.setSwapBudgets);
  const wonderKpUpdate = overlayStore((state) => state.wonderKpUpdate);

  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [wonders, setWonders] = useState<AncientWonder[] | null>(null);
  const [wondersAnchor, setWondersAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switching back to Inbox unmounts this mid-countdown, so drop the pending dismissal.
  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    ensureMinWidthAndHeight(400, 600);
  }, []);

  // The wonder catalog is immutable for the life of the page, so this runs once.
  useEffect(() => {
    async function loadWonders() {
      const finder = getBuildingFinder();
      try {
        await finder.ensureInitialized();
        setWonders(finder.getAncientWonders());
      } catch {
        setWonders([]);
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
      setAccount({
        messagesData: data?.messagesData,
        playerId: data?.cityQuery?.userData?.player_id,
        cityEntities: data?.cityQuery?.cityEntities,
        wonderKp: data?.cityQuery?.wonderKp,
      });
    }
    void loadAccount();
  }, [messagesUpdate, wonderKpUpdate]);

  // Until the watermark has been established, Infinity keeps every existing round out of the
  // list — so it never flashes your whole swap history on first open.
  const wonderNames = useMemo(() => (wonders ?? []).map((w) => w.name), [wonders]);

  const tally: SwapTally = useMemo(
    () => computeSwapTally(account?.messagesData, wonderNames, account?.playerId, swapsClearedAt ?? Infinity),
    [account, wonderNames, swapsClearedAt],
  );

  // Only the wonders you have built can be donated to, so that is the list worth offering.
  const ownedWonders = useMemo(() => getOwnedWonders(account?.cityEntities, wonders ?? []), [account, wonders]);

  const kpByBaseName = useMemo(() => new Map((account?.wonderKp ?? []).map((kp) => [kp.baseName, kp])), [account]);

  // First run on this account: adopt whatever your newest request post is, so the list starts
  // empty and only fills as you post from here on.
  useEffect(() => {
    if (swapsClearedAt === undefined && account !== null && wonders !== null) {
      setSwapsClearedAt(tally.latestRequestAt || Math.floor(Date.now() / 1000));
    }
  }, [swapsClearedAt, account, wonders, tally.latestRequestAt, setSwapsClearedAt]);

  // Requests are consumed as soon as they show up in the tally, not when the list is read, so
  // clearing the tally later cannot hand you back knowledge you have already asked for.
  useEffect(() => {
    const next = applySwapBudgets(swapBudgets, tally.entries);
    if (next !== swapBudgets) {
      setSwapBudgets(next);
    }
  }, [swapBudgets, tally.entries, setSwapBudgets]);

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

  // Long enough for the tick to register as confirmation, short enough that it feels like the
  // click dismissed it. On a failed copy the popover stays put rather than implying success.
  const copyRequest = async (wonder: AncientWonder) => {
    if (!(await copyText(requestTextFor(wonder.name)))) {
      return;
    }
    // Copying is the moment you commit to asking for this one, so that is when the count
    // starts. Nothing to start if the game has not told us what the wonder still needs.
    const progress = kpByBaseName.get(wonder.baseName);
    if (progress) {
      setSwapBudgets(
        seedSwapBudget(swapBudgets, {
          baseName: wonder.baseName,
          wonderName: wonder.name,
          remaining: wonderKpRemaining(progress),
          countedThrough: tally.latestRequestAt,
        }),
      );
    }
    setCopied(wonder.baseName);
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = setTimeout(() => {
      setWondersAnchor(null);
      setCopied(null);
    }, COPIED_DISMISS_MS);
  };

  // Clearing moves the watermark past every round on show, so they never come back — and,
  // unlike ticking rows off, it does not depend on us knowing whether you actually repaid.
  // Collapsing afterwards mirrors "Mark all as read" in chat: the list is now empty, so the
  // panel has nothing left to show and gets out of the way of the game.
  const clearAll = () => {
    setSwapsClearedAt(Math.max(swapsClearedAt ?? 0, tally.latestRequestAt));
    setPaidSwaps([]);
    expandPanel(false);
  };

  if (account === null || wonders === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Without the catalog there is no way to tell a request post from any other post.
  if (wonders.length === 0) {
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

  // Rendered inside the Messages pane's column, so it grows into the space left by the
  // Inbox/Outbox/Swaps switch rather than claiming the full height for itself.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ px: 1.5, py: 1, ...gildedBar, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SwapHorizIcon fontSize='small' sx={{ color: gild.bronze }} />
        {/* Deliberately just a label: the numbers that matter are the per-payee ones on each
            card, which are what you actually act on. */}
        <Typography sx={{ fontFamily: gild.serif, fontWeight: 700, color: gild.ink, flex: 1 }}>
          {payeesLeft === 0 ? 'Nothing to repay' : 'To repay'}
        </Typography>
        {/* Tucked behind a button: the list runs long and is only wanted at the moment of
            posting, so it should not hold space away from the debts. */}
        <Tooltip title='My wonders — copy a request'>
          <IconButton
            size='small'
            aria-label='My ancient wonders'
            onClick={(e) => setWondersAnchor(e.currentTarget)}
            sx={{ color: gild.bronze }}
          >
            <AccountBalanceIcon fontSize='small' />
          </IconButton>
        </Tooltip>
        {tally.entries.length > 0 && (
          <Button size='small' onClick={clearAll} sx={{ color: gild.bronze, fontSize: 12 }}>
            Clear all
          </Button>
        )}
      </Box>

      {swapBudgets.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            background: gild.cardTop,
            borderBottom: '1px solid',
            borderColor: gild.mid,
          }}
        >
          <Typography variant='caption' sx={{ color: gild.bronzeSoft, width: '100%', lineHeight: 1.3 }}>
            Room left to ask for
          </Typography>
          {swapBudgets.map((budget) => (
            <Chip
              key={budget.baseName}
              size='small'
              variant='outlined'
              label={
                budget.remaining === 0 ? `${budget.wonderName} · full` : `${budget.wonderName} · ${budget.remaining} KP`
              }
              onDelete={() => setSwapBudgets(swapBudgets.filter((b) => b.baseName !== budget.baseName))}
              sx={{
                height: 22,
                fontWeight: 700,
                color: budget.remaining === 0 ? '#8a6d00' : gild.bronze,
                borderColor: budget.remaining === 0 ? '#f0e0a0' : gild.mid,
                bgcolor: budget.remaining === 0 ? '#fff8e1' : 'rgba(255, 253, 246, 0.8)',
              }}
            />
          ))}
        </Box>
      )}

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

      <Popover
        open={wondersAnchor !== null}
        anchorEl={wondersAnchor}
        onClose={() => setWondersAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        // Popover is a Modal, and Modal portals to document.body by default. The overlay panel
        // is a fixed, z-index 9999 element on the game page, so a popover on the body sits at
        // MUI's modal layer (1300) — behind the panel, open and anchored but invisible.
        // Rendering in place keeps it inside the panel's own stacking context, where it cannot
        // be behind the panel whatever z-index the panel is given. Nothing between here and the
        // panel sets overflow, so staying inline costs no clipping.
        disablePortal
        sx={{ zIndex: OVERLAY_POPOVER_Z_INDEX }}
        slotProps={{ paper: { sx: { width: 280, maxHeight: 360, background: gild.cardTop } } }}
      >
        <Box sx={{ px: 1.5, py: 1, ...gildedBar, position: 'sticky', top: 0, zIndex: 1 }}>
          <Typography sx={{ ...authorType }}>Copy a request</Typography>
          <Typography variant='caption' sx={{ color: gild.bronzeSoft, display: 'block', lineHeight: 1.3 }}>
            {ownedWonders.length > 0
              ? 'Your wonders. Pick one to put “<wonder> please” on the clipboard.'
              : 'No wonders found in your city yet.'}
          </Typography>
        </Box>
        {ownedWonders.length === 0 ? (
          <Typography variant='body2' sx={{ color: gild.bronzeSoft, p: 2, textAlign: 'center' }}>
            Open your city in the game to load it, then try again.
          </Typography>
        ) : (
          <List disablePadding>
            {ownedWonders.map((wonder) => {
              const justCopied = copied === wonder.baseName;
              const progress = kpByBaseName.get(wonder.baseName);
              return (
                <ListItemButton
                  key={wonder.baseName}
                  onClick={() => void copyRequest(wonder)}
                  sx={{ py: 0.75, '&:hover': { background: 'rgba(201, 162, 39, 0.12)' } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ ...bodyType, fontSize: 13 }}>{wonder.name}</Typography>
                    {/* What the wonder can still take, so you can pick a thread it fits in
                        before you post rather than after. Silent when the game has not said
                        — a wonder collecting runes takes no knowledge at all. */}
                    {progress && (
                      <Typography sx={{ ...timestampType, display: 'block' }}>
                        needs {wonderKpRemaining(progress)} KP
                      </Typography>
                    )}
                  </Box>
                  {justCopied ? (
                    <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center', color: gild.deep }}>
                      <CheckIcon fontSize='small' />
                      <Typography variant='caption' sx={{ fontWeight: 700 }}>
                        Copied
                      </Typography>
                    </Stack>
                  ) : (
                    <ContentCopyIcon fontSize='small' sx={{ color: gild.bronzeSoft }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Popover>
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
