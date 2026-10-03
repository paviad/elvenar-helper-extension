import React, { useEffect, useMemo, useRef, useState } from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AncientWonder, getBuildingFinder } from '../city/buildingFinder';
import { getAccountById, loadAccount } from '../elvenar/accountStore';
import { countKpInstants, describeKpInstants } from '../inventory/kpInstants';
import { CityEntity } from '../model/cityEntity';
import { MessagesData } from '../model/gameMessage';
import { KpGift } from '../model/kpGiven';
import { clampFullThreadPosts, SwapEntry, swapPaidKey, SwapTally } from '../model/kpSwap';
import { WonderKp } from '../model/wonderKp';
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
import { computeSwapTally } from './kpSwaps/computeSwapTally';
import { getOwnedWonders } from './kpSwaps/getOwnedWonders';
import { getUpgradingWonders } from './kpSwaps/getUpgradingWonders';
import { givenToPayee, GivenToPayee, remainingOwed } from './kpSwaps/givenToPayee';
import { groupSwapsByPayee, PayeeGroup } from './kpSwaps/groupSwapsByPayee';
import { roomLeftFor } from './kpSwaps/roomLeftFor';
import { getAccountId, getOverlayStore } from './overlayStore';

interface AccountSnapshot {
  messagesData?: MessagesData;
  playerId?: number;
  cityEntities?: CityEntity[];
  wonderKp?: WonderKp[];
  kpGifts?: KpGift[];
  /** KP instants on hand; absent until the game has sent the inventory. */
  kpInstants?: Record<number, number>;
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

/** Posted in a full thread to retire it, in the words the swap threads use. */
const RETIRE_NOTICE = 'Please DELETE starting new thread';

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
  const watchedWonders = overlayStore((state) => state.watchedWonders);
  const setWatchedWonders = overlayStore((state) => state.setWatchedWonders);
  const wonderKpUpdate = overlayStore((state) => state.wonderKpUpdate);
  const fullThreadPosts = overlayStore((state) => state.fullThreadPosts);
  const setFullThreadPosts = overlayStore((state) => state.setFullThreadPosts);
  const inventoryUpdate = overlayStore((state) => state.inventoryUpdate);

  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [wonders, setWonders] = useState<AncientWonder[] | null>(null);
  const [wondersAnchor, setWondersAnchor] = useState<HTMLElement | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  // What is in the box while you type, so a half-typed number is not thrown out or clamped
  // under your fingers. Stored as soon as it reads as a number; put back as it was on leaving
  // if it never did.
  const [postsDraft, setPostsDraft] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which full-thread button last copied, so it can say so for a moment.
  const [copiedRetire, setCopiedRetire] = useState<string | null>(null);
  const retireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switching back to Inbox unmounts this mid-countdown, so drop the pending dismissal.
  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
      if (retireTimer.current) {
        clearTimeout(retireTimer.current);
      }
    },
    [],
  );

  const copyForRetiring = async (key: string, text: string) => {
    if (!(await copyText(text))) {
      return;
    }
    setCopiedRetire(key);
    if (retireTimer.current) {
      clearTimeout(retireTimer.current);
    }
    retireTimer.current = setTimeout(() => setCopiedRetire(null), 1500);
  };

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
    async function readAccount() {
      const accountId = getAccountId();
      if (!accountId) {
        setAccount({});
        return;
      }
      await loadAccount(accountId);
      const data = getAccountById(accountId);
      setAccount({
        messagesData: data?.messagesData,
        playerId: data?.cityQuery?.userData?.player_id,
        cityEntities: data?.cityQuery?.cityEntities,
        wonderKp: data?.cityQuery?.wonderKp,
        kpGifts: data?.kpGiven?.gifts,
        kpInstants: data?.inventoryItems && countKpInstants(data.inventoryItems),
      });
    }
    void readAccount();
  }, [messagesUpdate, wonderKpUpdate, inventoryUpdate]);

  // Until the watermark has been established, Infinity keeps every existing round out of the
  // list — so it never flashes your whole swap history on first open.
  const wonderNames = useMemo(() => (wonders ?? []).map((w) => w.name), [wonders]);

  const tally: SwapTally = useMemo(
    () =>
      computeSwapTally(
        account?.messagesData,
        wonderNames,
        account?.playerId,
        swapsClearedAt ?? Infinity,
        fullThreadPosts,
      ),
    [account, wonderNames, swapsClearedAt, fullThreadPosts],
  );

  // Only the wonders you have built can be donated to, so that is the list worth offering.
  const ownedWonders = useMemo(() => getOwnedWonders(account?.cityEntities, wonders ?? []), [account, wonders]);

  const kpByBaseName = useMemo(() => new Map((account?.wonderKp ?? []).map((kp) => [kp.baseName, kp])), [account]);

  // A wonder mid-upgrade already reports the next level's requirement, so it would otherwise
  // read as a full round waiting to be asked for.
  const upgrading = useMemo(() => getUpgradingWonders(account?.cityEntities), [account]);

  // The game's figure counts everything the wonder has not been given, including the requests
  // you have posted and are still waiting on, so those come off it. Derived on every render
  // from the threads themselves rather than kept anywhere — see roomLeftFor.
  const roomFor = (baseName: string, wonderName: string) =>
    roomLeftFor(kpByBaseName.get(baseName), tally.pendingRequests, wonderName);

  // First run on this account: adopt whatever your newest request post is, so the list starts
  // empty and only fills as you post from here on.
  useEffect(() => {
    if (swapsClearedAt === undefined && account !== null && wonders !== null) {
      setSwapsClearedAt(tally.latestRequestAt || Math.floor(Date.now() / 1000));
    }
  }, [swapsClearedAt, account, wonders, tally.latestRequestAt, setSwapsClearedAt]);

  const paid = useMemo(() => new Set(paidSwaps), [paidSwaps]);

  // Grouped from the full list, not just the unpaid ones, so a payee keeps their place in the
  // list as you tick their threads off instead of jumping about under the cursor.
  const groups = useMemo(() => groupSwapsByPayee(tally.entries), [tally]);

  // What the game has seen you put into each payee's wonders since you posted — see
  // givenToPayee for why it is counted per player rather than per thread.
  const given = useMemo(
    () => new Map(groups.map((g) => [g.playerId, givenToPayee(g.playerId, g.entries, account?.kpGifts ?? [])])),
    [groups, account],
  );
  const givenTo = (group: PayeeGroup) => given.get(group.playerId) ?? { total: 0, byWonder: [] };

  const payeesLeft = groups.filter((g) => remainingOwed(g.entries, paid, givenTo(g).total) > 0).length;

  const namesByBaseName = useMemo(() => new Map((wonders ?? []).map((w) => [w.baseName, w.name])), [wonders]);

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
    // Copying is the moment you commit to asking for this one, so that is when it starts
    // being watched. Nothing worth watching if the game has said nothing about the wonder.
    if (roomFor(wonder.baseName, wonder.name) !== undefined) {
      setWatchedWonders([
        ...watchedWonders.filter((w) => w.baseName !== wonder.baseName),
        { baseName: wonder.baseName, wonderName: wonder.name },
      ]);
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
    // The watched wonders go with it: they are a worklist for the round you have just closed,
    // and nothing is lost by dropping them, since each figure is derived rather than kept.
    setWatchedWonders([]);
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
        <Tooltip title='Swaps settings'>
          <IconButton
            size='small'
            aria-label='Swaps settings'
            onClick={(e) => {
              setPostsDraft(String(fullThreadPosts));
              setSettingsAnchor(e.currentTarget);
            }}
            sx={{ color: gild.bronze }}
          >
            <TuneIcon fontSize='small' />
          </IconButton>
        </Tooltip>
        {tally.entries.length > 0 && (
          <Button size='small' onClick={clearAll} sx={{ color: gild.bronze, fontSize: 12 }}>
            Clear all
          </Button>
        )}
      </Box>

      {/* What you have to repay with, next to what you owe. */}
      {account.kpInstants && (
        <Box sx={{ px: 1.5, py: 0.5, background: gild.cardTop, borderBottom: '1px solid', borderColor: gild.mid }}>
          <Typography variant='caption' sx={{ color: gild.bronzeSoft, lineHeight: 1.3 }}>
            {describeKpInstants(account.kpInstants)}
          </Typography>
        </Box>
      )}

      {watchedWonders.length > 0 && (
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
          {watchedWonders.map((watched) => {
            const room = roomFor(watched.baseName, watched.wonderName) ?? 0;
            // Both mean "do not ask this one for anything", so both wear the warning colours.
            const busy = upgrading.has(watched.baseName);
            const closed = busy || room === 0;
            return (
              <Chip
                key={watched.baseName}
                size='small'
                variant='outlined'
                label={`${watched.wonderName} · ${busy ? 'upgrading' : room === 0 ? 'full' : `${room} KP`}`}
                onDelete={() => setWatchedWonders(watchedWonders.filter((w) => w.baseName !== watched.baseName))}
                sx={{
                  height: 22,
                  fontWeight: 700,
                  color: closed ? '#8a6d00' : gild.bronze,
                  borderColor: closed ? '#f0e0a0' : gild.mid,
                  bgcolor: closed ? '#fff8e1' : 'rgba(255, 253, 246, 0.8)',
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Only the text is offered: posting the notice and starting the new thread are yours
          to do in the game. Once both are done the thread drops off this list by itself. */}
      {tally.fullThreads.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            background: gild.cardTop,
            borderBottom: '1px solid',
            borderColor: gild.mid,
          }}
        >
          <Typography variant='caption' sx={{ color: gild.bronzeSoft, display: 'block', lineHeight: 1.3 }}>
            Threads of {fullThreadPosts}+ posts — post the notice, then start a new one with the same title
          </Typography>
          {tally.fullThreads.map((full) => {
            const noticeKey = `${full.threadId}:notice`;
            const titleKey = `${full.threadId}:title`;
            return (
              <Stack key={full.threadId} direction='row' spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
                <Typography sx={{ ...bodyType, fontSize: 13, flex: 1, minWidth: 0 }} noWrap>
                  {full.subject}
                </Typography>
                <Typography sx={{ ...timestampType, fontVariantNumeric: 'tabular-nums' }}>
                  {full.posts} posts
                </Typography>
                <Button
                  size='small'
                  onClick={() => void copyForRetiring(noticeKey, RETIRE_NOTICE)}
                  sx={{ color: gild.bronze, fontSize: 11, minWidth: 0, px: 0.75 }}
                >
                  {copiedRetire === noticeKey ? 'Copied' : 'Copy notice'}
                </Button>
                <Button
                  size='small'
                  onClick={() => void copyForRetiring(titleKey, full.subject)}
                  sx={{ color: gild.bronze, fontSize: 11, minWidth: 0, px: 0.75 }}
                >
                  {copiedRetire === titleKey ? 'Copied' : 'Copy title'}
                </Button>
              </Stack>
            );
          })}
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
                given={givenTo(group)}
                wonderName={(baseName) => namesByBaseName.get(baseName) ?? baseName}
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

      {/* In place for the same reason as the wonder list below: a portalled popover sits
          behind the panel. */}
      <Popover
        open={settingsAnchor !== null}
        anchorEl={settingsAnchor}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disablePortal
        sx={{ zIndex: OVERLAY_POPOVER_Z_INDEX }}
        slotProps={{ paper: { sx: { width: 240, p: 1.5, background: gild.cardTop } } }}
      >
        <Typography sx={{ ...authorType, mb: 1 }}>Swaps settings</Typography>
        <TextField
          size='small'
          type='number'
          label='Offer to replace a thread at'
          value={postsDraft}
          onChange={(e) => {
            setPostsDraft(e.target.value);
            const posts = clampFullThreadPosts(e.target.value);
            if (posts !== undefined && String(posts) === e.target.value.trim()) {
              setFullThreadPosts(posts);
            }
          }}
          onBlur={() => {
            const posts = clampFullThreadPosts(postsDraft);
            if (posts !== undefined) {
              setFullThreadPosts(posts);
            }
            setPostsDraft(String(posts ?? fullThreadPosts));
          }}
          // The game listens for keys on the page, so typing here must not reach it.
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          slotProps={{ htmlInput: { min: 100, max: 1000, step: 10 }, input: { endAdornment: 'posts' } }}
          fullWidth
        />
      </Popover>

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
              const room = roomFor(wonder.baseName, wonder.name);
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
                        — a wonder collecting runes takes no knowledge at all. One building its
                        new level says so instead: the figure alongside it belongs to the level
                        going up, and reads as a whole round waiting to be asked for. */}
                    {upgrading.has(wonder.baseName) ? (
                      <Typography sx={{ ...timestampType, display: 'block' }}>upgrading</Typography>
                    ) : (
                      room !== undefined && (
                        <Typography sx={{ ...timestampType, display: 'block' }}>
                          {room === 0 ? 'no room left' : `needs ${room} KP`}
                        </Typography>
                      )
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
  /** Rows you have ticked off by hand. */
  paid: Set<string>;
  /** What the game has seen you give this player since you posted. */
  given: GivenToPayee;
  wonderName: (baseName: string) => string;
  onToggleGroup: (nextPaid: boolean) => void;
  onToggleEntry: (entry: SwapEntry, nextPaid: boolean) => void;
}

// One card per person to repay. The header carries what you still owe them — that is the
// number you act on. Beneath it, what the game has seen you give them, wonder by wonder, and
// then the threads you owe in, each with its own amount and the wonder they asked for. The
// two lists are left side by side rather than matched up: a thread names its wonder in the
// player's own words, and reading those would be a guess.
const PayeeCard = ({ group, paid, given, wonderName, onToggleGroup, onToggleEntry }: PayeeCardProps) => {
  const remaining = remainingOwed(group.entries, paid, given.total);
  const allPaid = remaining === 0;
  const tickedCount = group.entries.filter((e) => paid.has(swapPaidKey(e))).length;
  // Once the game has seen the whole amount given, the card is done whatever the boxes say, so
  // they are not offered for unticking.
  const paidInGame = given.total >= group.total;
  const shown = Math.min(given.total, group.total);

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
              label={`${allPaid ? group.total : remaining} KP`}
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
              indeterminate={tickedCount > 0 && !allPaid}
              disabled={paidInGame}
              onChange={() => onToggleGroup(tickedCount < group.entries.length)}
              slotProps={{ input: { 'aria-label': `Mark everything owed to ${group.name} as given` } }}
              sx={{
                p: 0.25,
                color: gild.mid,
                '&.Mui-checked': { color: gild.deep },
                '&.MuiCheckbox-indeterminate': { color: gild.deep },
              }}
            />
          </Stack>

          {/* Fills as the game reports you giving to them, whichever way you give. */}
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <LinearProgress
              variant='determinate'
              value={(shown / group.total) * 100}
              aria-label={`${shown} of ${group.total} KP given to ${group.name}`}
              sx={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                bgcolor: 'rgba(201, 162, 39, 0.18)',
                '& .MuiLinearProgress-bar': { bgcolor: gild.deep, borderRadius: 3 },
              }}
            />
            <Typography sx={{ ...timestampType, fontVariantNumeric: 'tabular-nums' }}>
              {given.total} / {group.total}
            </Typography>
          </Stack>
          {given.byWonder.map((w) => (
            <Stack key={w.baseName} direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography sx={{ ...timestampType, flex: 1, minWidth: 0 }} noWrap>
                {wonderName(w.baseName)}
              </Typography>
              <Typography sx={{ ...timestampType, fontVariantNumeric: 'tabular-nums' }}>{w.amount} KP</Typography>
            </Stack>
          ))}

          <Box aria-hidden sx={{ ...engravedRule }} />

          <Stack spacing={0.75}>
            {group.entries.map((entry) => {
              const entryPaid = allPaid || paid.has(swapPaidKey(entry));
              return (
                <Box key={swapPaidKey(entry)} sx={{ opacity: !allPaid && entryPaid ? 0.5 : 1 }}>
                  <Stack direction='row' spacing={1} sx={{ alignItems: 'flex-start' }}>
                    {/* Per-thread ticks only earn their place when there is more than one. */}
                    {group.entries.length > 1 && (
                      <Checkbox
                        size='small'
                        checked={entryPaid}
                        disabled={paidInGame}
                        onChange={() => onToggleEntry(entry, !paid.has(swapPaidKey(entry)))}
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
