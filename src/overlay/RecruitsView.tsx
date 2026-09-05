import React from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import InsightsIcon from '@mui/icons-material/Insights';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Badge,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import '../chrome/recruitMessages';
import { sendRuntime } from '../chrome/messages';
import { relayToGame } from '../inject/relayToGame';
import { elvenStatsPlayerUrl } from '../recruits/elvenStats';
import {
  ActivitySettings,
  activitySignList,
  activityVerdict,
  ActivityVerdict,
  chapterStatus,
  ElvenStatsReading,
  ExactScoreSource,
  FellowshipProfile,
  fellowshipProfile,
  fellowshipTimeline,
  MIN_RECRUIT_CHAPTER,
  OPEN_STAGES,
  Recruit,
  RecruitBook,
  RecruitSource,
  RecruitStage,
  Sign,
  summariseSigns,
} from '../recruits/recruitBook';
import { OVERLAY_MENU_Z_INDEX } from './overlayStacking';
import { getAccountId, getOverlayStore } from './overlayStore';
import { RecruitDiagnostics } from './RecruitDiagnostics';

const STAGE_LABELS: Record<RecruitStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  defecting: 'Maybe defecting',
  joined: 'Joined',
  declined: 'Declined',
  joinedElsewhere: 'Joined elsewhere',
  dismissed: 'Deemed unfit',
  gone: 'Gone',
  formerMember: 'Left your fellowship',
};

const VERDICT_STYLE: Record<ActivityVerdict, { label: string; color: 'success' | 'default' | 'error' }> = {
  active: { label: 'Active', color: 'success' },
  unclear: { label: 'Unclear', color: 'default' },
  dormant: { label: 'Dormant', color: 'error' },
};

/** What each verdict means, for its tooltip, in terms of the Signs and Days settings. */
const verdictHelp = (verdict: ActivityVerdict, { minSigns, windowDays }: ActivitySettings) => {
  const signs = `${minSigns} sign${minSigns === 1 ? '' : 's'}`;
  const days = `${windowDays} day${windowDays === 1 ? '' : 's'}`;
  switch (verdict) {
    case 'active':
      return `Active: at least ${signs} of activity in the last ${days} - a score change up or down (ours or ElvenStats'), a message, or neighbourly help or another notification from them.`;
    case 'dormant':
      return `Dormant: no sign of activity, and either the game or ElvenStats marks them inactive, or their score has been seen unchanged for at least ${days}.`;
    case 'unclear':
      return `Unclear: fewer than ${signs} in the last ${days}, but not watched long enough to call them dormant. More score readings or an ElvenStats check will settle it.`;
  }
};

/** How many rows are drawn at first, and how many more each Show more adds. */
const PAGE_SIZE = 50;

/** d/M/yy - for dates that can be years back. */
const dateWithYear = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
};

/** "3w", "10mo", "4y" - roughly how long ago, for a chip. */
const roughAge = (at: number, now: number) => {
  const days = Math.max(0, Math.floor((now - at) / (24 * 60 * 60 * 1000)));
  if (days < 14) return `${days}d`;
  if (days < 61) return `${Math.floor(days / 7)}w`;
  if (days < 730) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
};

/** The fellowship chip on a row: what it says, its colour, and the tooltip explaining it. */
const fellowshipChip = (profile: FellowshipProfile, now: number) => {
  switch (profile.kind) {
    case 'solo':
      return {
        label: profile.since ? `Solo ${roughAge(profile.since, now)}` : 'Solo',
        color: 'warning' as const,
        help: `Never in a fellowship since ElvenStats started tracking them${profile.since ? ` (${dateWithYear(profile.since)})` : ''}. Used to playing alone, and likely used to turning invitations down.`,
      };
    case 'left': {
      // When nobody looked for a while, all that is known is that they left between two dates.
      const bracketed = profile.at - profile.memberUntil > 2 * 24 * 60 * 60 * 1000;
      const when = bracketed
        ? `between ${dateWithYear(profile.memberUntil)} and ${dateWithYear(profile.at)}`
        : `on ${dateWithYear(profile.at)}`;
      return {
        label: bracketed ? `Left <${roughAge(profile.memberUntil, now)} ago` : `Left ${roughAge(profile.at, now)} ago`,
        color: profile.recently ? ('success' as const) : ('default' as const),
        help: `Left ${profile.lastName ?? 'their fellowship'} ${when}; ${profile.count} fellowship${profile.count === 1 ? '' : 's'} in their history.${profile.recently ? ' Recently out of one - a good time to reach them.' : ''}`,
      };
    }
    case 'member':
      return {
        label: `Member · ${profile.count} fellowship${profile.count === 1 ? '' : 's'}`,
        color: 'default' as const,
        help: `In a fellowship by ElvenStats' last check and by what the game last showed; ${profile.count} in their history.`,
      };
  }
};

/** Within a verdict: recent leavers first, long-time solo players last. */
const fellowshipOrder = (profile: FellowshipProfile | undefined) =>
  profile?.kind === 'left' && profile.recently ? 0 : profile?.kind === 'solo' ? 2 : 1;

/**
 * Their fellowship timeline for the open row, oldest first, with what the game showed us marked:
 * "Farmers 14/3/18 → none 8/4/18 → … → none 17/10/26 (game)".
 */
const describeFellowshipHistory = (recruit: Recruit) => {
  const timeline = fellowshipTimeline(recruit);
  const reading = recruit.elvenStats?.found ? recruit.elvenStats : undefined;
  const since = reading?.trackedSince ? `ElvenStats since ${dateWithYear(reading.trackedSince)}` : 'as we saw it';
  if (timeline.length === 0) {
    return undefined;
  }
  if (timeline.every((entry) => entry.id === undefined) && reading?.fellowships) {
    return `Fellowships (${since}): never in one`;
  }
  const entries = timeline.map(
    (entry) =>
      `${entry.id === undefined ? 'none' : (entry.name ?? `#${entry.id}`)} ${dateWithYear(entry.at)}${entry.source === 'game' ? ' (game)' : ''}`,
  );
  return `Fellowships (${since}): ${entries.join(' → ')}`;
};

const VERDICT_ORDER: Record<ActivityVerdict, number> = { active: 0, unclear: 1, dormant: 2 };

const SOURCE_LABELS: Record<RecruitSource, string> = {
  neighbour: 'neighbour',
  visit: 'visit',
  ranking: 'ranking',
  wonder: 'wonder contributor',
  message: 'message',
  profile: 'profile',
  elvenstats: 'ElvenStats',
  trade: 'trade offer',
};

type Filter = 'qualified' | 'unverified' | 'inProgress' | 'closed';

/** Once someone has been written to, the chapter no longer decides where they are listed. */
const filterOf = (recruit: Recruit): Filter =>
  !OPEN_STAGES.includes(recruit.stage)
    ? 'closed'
    : recruit.stage === 'contacted' || recruit.stage === 'replied' || recruit.stage === 'defecting'
      ? 'inProgress'
      : chapterStatus(recruit)
        ? 'qualified'
        : 'unverified';

/** The exact chapter where it has been seen, `5+` where only the score vouches for it. */
const chapterLabel = (recruit: Recruit) =>
  recruit.chapter ?? (chapterStatus(recruit) === 'byScore' ? `${MIN_RECRUIT_CHAPTER}+` : '?');

/** d/M - day and month, no leading zeros. */
const shortDate = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const EXACT_SOURCE_LABELS: Record<ExactScoreSource, string> = {
  ranking: 'ranking',
  visit: 'visit',
  elvenstats: 'ElvenStats',
};

/**
 * The score for the row: the latest exact figure with where and when it came from, or, when there
 * is none, the score lookup's sum, marked as the estimate it is (it leaves parts of the ranking
 * points out). How the score has moved is in the signs.
 */
const describeScore = (recruit: Recruit) => {
  const exact = recruit.exactScore;
  if (exact) {
    return `${exact.score.toLocaleString()} (${EXACT_SOURCE_LABELS[exact.source]} ${shortDate(exact.at)})`;
  }
  const estimate = [...recruit.scores].reverse().find((s) => s.kind === 'overview');
  return estimate ? `≈${estimate.score.toLocaleString()}` : undefined;
};

/** What ElvenStats says, in a few words for the row. */
const describeElvenStats = (recruit: Recruit) => {
  const reading = recruit.elvenStats;
  if (!reading) {
    return undefined;
  }
  if (!reading.found) {
    return 'not on ElvenStats';
  }
  const parts = [
    reading.isActive === false ? 'inactive' : undefined,
    reading.lastScoreChange !== undefined ? `last change ${shortDate(reading.lastScoreChange)}` : undefined,
  ].filter(Boolean);
  return `ElvenStats: ${parts.join(', ') || 'no change recorded'}`;
};

/**
 * Typing in the panel must stay in the panel: the game listens for its hotkeys on the page, and
 * every letter would otherwise reach it too.
 */
const keepKeysFromGame = (e: React.KeyboardEvent) => e.stopPropagation();

/**
 * Every ElvenStats date spelled out for the expanded row, each saying what it is about: when the
 * score last moved, when they last looked at the player, and when we last asked them.
 */
const describeElvenStatsDates = (reading: ElvenStatsReading) => {
  const asked = `we asked ${shortDate(reading.checkedAt)}`;
  if (!reading.found) {
    return `ElvenStats: doesn't track them · ${asked}`;
  }
  return [
    'ElvenStats:',
    reading.lastScoreChange !== undefined
      ? `score last changed ${shortDate(reading.lastScoreChange)}`
      : 'no score change recorded',
    reading.updatedAt !== undefined ? `· they checked ${shortDate(reading.updatedAt)}` : undefined,
    reading.isActive === false ? '· flagged inactive' : undefined,
    `· ${asked}`,
  ]
    .filter(Boolean)
    .join(' ');
};

const edit = async (
  playerId: number,
  change: { stage?: RecruitStage; notes?: string; remove?: boolean; restore?: boolean },
) => {
  const accountId = getAccountId();
  if (accountId) {
    await sendRuntime('editRecruit', { accountId, playerId, ...change });
  }
};

interface RecruitRowProps {
  recruit: Recruit;
  verdict: ActivityVerdict;
  /** The signs inside the window, newest first. */
  signs: Sign[];
  /** From ElvenStats' fellowship history, when there is one. */
  fellowship?: FellowshipProfile;
  /** When the list last worked the rows out, for how long ago things were. */
  now: number;
  settings: ActivitySettings;
  score?: string;
  /** The game world as ElvenStats names it, once known. */
  server?: string;
  /** Whether the ElvenStats lookups have been stopped. */
  elvenStatsOff: boolean;
  /** Held by the list, so Collapse all can close every row at once. */
  expanded: boolean;
  /** The same function for every row and every render, so it never makes a row draw again. */
  onToggle: (playerId: number) => void;
}

/**
 * Whether a row would draw the same. The candidate is the same object whenever its data has not
 * changed (see useRecruitBook), and the signs are worked out afresh each minute, so they are
 * compared by what the row shows of them rather than by identity.
 */
const sameRow = (a: RecruitRowProps, b: RecruitRowProps) =>
  a.recruit === b.recruit &&
  a.verdict === b.verdict &&
  a.score === b.score &&
  a.settings === b.settings &&
  a.server === b.server &&
  a.elvenStatsOff === b.elvenStatsOff &&
  JSON.stringify(a.fellowship) === JSON.stringify(b.fellowship) &&
  a.expanded === b.expanded &&
  a.onToggle === b.onToggle &&
  a.signs.length === b.signs.length &&
  a.signs.every((sign, i) => sign.at === b.signs[i].at && sign.text === b.signs[i].text);

const RecruitRowContent: React.FC<RecruitRowProps> = ({
  recruit,
  verdict,
  signs,
  fellowship,
  now,
  settings,
  score,
  server,
  elvenStatsOff,
  expanded,
  onToggle,
}) => {
  const [lookup, setLookup] = React.useState<string | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  /** Puts their name on the clipboard, for the in-game message's recipient box. */
  const copyName = async (e: React.MouseEvent) => {
    // The name sits in the part of the row that opens it; copying should not open it too.
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(recruit.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.log('recruits: could not copy the name', error);
    }
  };

  /** Asks ElvenStats, or has them rescan first, and says what went wrong if anything did. */
  const askElvenStats = async (type: 'lookUpElvenStats' | 'refreshElvenStats') => {
    const accountId = getAccountId();
    if (!accountId) {
      return;
    }
    setBusy(true);
    setLookup(type === 'refreshElvenStats' ? 'ElvenStats is rescanning… this can take a minute' : 'Asking…');
    try {
      const answer = await sendRuntime(type, { accountId, playerId: recruit.playerId });
      setLookup(answer?.success ? undefined : (answer?.message ?? 'No answer'));
    } finally {
      setBusy(false);
    }
  };
  // What is being typed, until it is saved; the stored notes show the rest of the time.
  const [draft, setDraft] = React.useState<string | undefined>(undefined);
  const notes = draft ?? recruit.notes ?? '';
  const style = VERDICT_STYLE[verdict];

  const details = [
    recruit.guild ? `in ${recruit.guild.name ?? 'a fellowship'}` : undefined,
    score && `score ${score}`,
    describeElvenStats(recruit),
    recruit.contactedAt && `contacted ${shortDate(recruit.contactedAt)}`,
    recruit.repliedAt && `replied ${shortDate(recruit.repliedAt)}`,
    recruit.lastMessageAt &&
    recruit.lastMessageAt !== recruit.repliedAt &&
    recruit.lastMessageAt !== recruit.contactedAt
      ? `last message ${shortDate(recruit.lastMessageAt)}`
      : undefined,
    recruit.unrankedAt !== undefined && `not in the rankings since ${shortDate(recruit.unrankedAt)}`,
  ].filter(Boolean);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1, py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {/* The sign count rides on the verdict's corner rather than taking a slot of its own: on the
            narrow panel every pixel of the row goes to the name and its chips. */}
        <Tooltip
          title={
            <>
              <div>{verdictHelp(verdict, settings)}</div>
              {signs.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {signs.length} sign{signs.length === 1 ? '' : 's'}: {summariseSigns(signs)}
                </div>
              )}
            </>
          }
        >
          <Badge
            badgeContent={signs.length}
            color='info'
            invisible={signs.length === 0}
            max={99}
            sx={{
              flexShrink: 0,
              '& .MuiBadge-badge': { height: 15, minWidth: 15, fontSize: 10, px: 0.4, top: 2, right: 2 },
            }}
          >
            <Chip
              size='small'
              label={style.label}
              color={style.color}
              sx={{ minWidth: 58, height: 20, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
            />
          </Badge>
        </Tooltip>
        <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onToggle(recruit.playerId)}>
          <Typography variant='body2' noWrap>
            <strong>{recruit.name}</strong>
            <Tooltip title={copied ? 'Copied' : 'Copy the name'}>
              <IconButton
                size='small'
                onClick={(e) => void copyName(e)}
                sx={{ p: 0.25, mx: 0.25, verticalAlign: 'text-bottom' }}
              >
                {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
            · ch {chapterLabel(recruit)}
            {fellowship &&
              (() => {
                const chip = fellowshipChip(fellowship, now);
                return (
                  <Tooltip title={chip.help}>
                    <Chip
                      size='small'
                      color={chip.color}
                      label={chip.label}
                      sx={{ ml: 0.75, height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  </Tooltip>
                );
              })()}
          </Typography>
          <Typography variant='caption' color='text.secondary' noWrap component='div'>
            {details.join(' · ')}
          </Typography>
        </Box>
        <Select
          size='small'
          variant='standard'
          value={recruit.stage}
          onChange={(e) => void edit(recruit.playerId, { stage: e.target.value })}
          sx={{ fontSize: 13, minWidth: 110 }}
          // On the body the menu opens under the panel; inside it, it only has to clear the panel's
          // own children.
          MenuProps={{ disablePortal: true, sx: { zIndex: OVERLAY_MENU_Z_INDEX } }}
        >
          {Object.entries(STAGE_LABELS).map(([stage, label]) => (
            <MenuItem key={stage} value={stage} sx={{ fontSize: 13 }}>
              {label}
            </MenuItem>
          ))}
        </Select>
        {/* Tight together: three icons need little room between them, and the room goes to the name. */}
        <Box sx={{ display: 'flex', flexShrink: 0, '& .MuiIconButton-root': { p: 0.25 } }}>
          <Tooltip title='Visit their city'>
            <IconButton size='small' onClick={() => relayToGame('visitCity', recruit.playerId)}>
              <VisibilityIcon fontSize='small' />
            </IconButton>
          </Tooltip>
          {server && (
            <Tooltip title='Open their ElvenStats page'>
              <IconButton
                size='small'
                onClick={() => window.open(elvenStatsPlayerUrl(server, recruit.playerId), '_blank', 'noopener')}
              >
                <InsightsIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title='Remove from the list - you can restore them from Closed'>
            <IconButton size='small' onClick={() => void edit(recruit.playerId, { remove: true })}>
              <DeleteIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {expanded && (
        <Box sx={{ pl: 1, pt: 0.5 }}>
          <Typography variant='caption' color='text.secondary' component='div'>
            Found via {recruit.sources.map((s) => SOURCE_LABELS[s]).join(', ')} · we first saw them{' '}
            {shortDate(recruit.firstSeen)} · last saw them {shortDate(recruit.lastSeen)}
            {recruit.scoreCheckedAt && ` · we read their score ${shortDate(recruit.scoreCheckedAt)}`}
            {recruit.isActive === false && ' · the game marks them inactive'}
          </Typography>
          {recruit.elvenStats && (
            <Typography variant='caption' color='text.secondary' component='div'>
              {describeElvenStatsDates(recruit.elvenStats)}
            </Typography>
          )}
          {describeFellowshipHistory(recruit) && (
            <Typography variant='caption' color='text.secondary' component='div'>
              {describeFellowshipHistory(recruit)}
            </Typography>
          )}
          <Typography variant='caption' component='div' sx={{ mt: 0.5, fontWeight: 'bold' }}>
            {signs.length
              ? `Signs in the last ${settings.windowDays} days`
              : `No signs of activity in the last ${settings.windowDays} days`}
          </Typography>
          {signs.map((sign, i) => (
            <Typography key={`${sign.at}-${i}`} variant='caption' color='text.secondary' component='div' sx={{ pl: 1 }}>
              {shortDate(sign.at)} · {sign.text}
            </Typography>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Button
              size='small'
              variant='outlined'
              disabled={!server || elvenStatsOff || busy}
              onClick={() => void askElvenStats('lookUpElvenStats')}
            >
              Check ElvenStats now
            </Button>
            <Tooltip title='Has ElvenStats rescan them from the game now, waits for it, then checks again'>
              <span>
                <Button
                  size='small'
                  variant='outlined'
                  disabled={!server || elvenStatsOff || busy}
                  onClick={() => void askElvenStats('refreshElvenStats')}
                >
                  Refresh and recheck
                </Button>
              </span>
            </Tooltip>
            {lookup && (
              <Typography variant='caption' color='text.secondary'>
                {lookup}
              </Typography>
            )}
          </Box>
          <TextField
            size='small'
            fullWidth
            multiline
            placeholder='Notes'
            value={notes}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={keepKeysFromGame}
            onKeyUp={keepKeysFromGame}
            onBlur={() => {
              if (draft !== undefined && draft !== (recruit.notes ?? '')) {
                void edit(recruit.playerId, { notes: draft });
              }
              setDraft(undefined);
            }}
            sx={{ mt: 0.5 }}
          />
        </Box>
      )}
    </Box>
  );
};

/** Rows draw again only when what they show has changed: there can be hundreds of them. */
const RecruitRow = React.memo(RecruitRowContent, sameRow);

/**
 * The candidates removed by hand, at the bottom of Closed, folded away until opened. Each can be
 * restored; those removed before entries were kept are only an id, and restoring one lifts the
 * block so the next source to see them adds them again.
 */
const RemovedSection: React.FC<{ book: RecruitBook }> = ({ book }) => {
  const [open, setOpen] = React.useState(false);
  const kept = Object.values(book.recruits)
    .filter((r) => r.removedAt !== undefined)
    .sort((a, b) => b.removedAt! - a.removedAt!);
  const idsOnly = Object.entries(book.removed ?? {})
    .filter(([id]) => !book.recruits[id])
    .sort(([, a], [, b]) => b.at - a.at);
  const total = kept.length + idsOnly.length;
  if (total === 0) {
    return null;
  }

  const line = (key: string, playerId: number, name: string, removedAt: number, stage?: RecruitStage) => (
    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.25 }}>
      <Typography variant='body2' noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
        <strong>{name}</strong>
        <Typography component='span' variant='caption' color='text.secondary'>
          {' '}
          · removed {shortDate(removedAt)}
          {stage ? ` · ${STAGE_LABELS[stage]}` : ''}
        </Typography>
      </Typography>
      {book.server && (
        <Tooltip title='Open their ElvenStats page'>
          <IconButton
            size='small'
            sx={{ p: 0.25 }}
            onClick={() => window.open(elvenStatsPlayerUrl(book.server!, playerId), '_blank', 'noopener')}
          >
            <InsightsIcon fontSize='small' />
          </IconButton>
        </Tooltip>
      )}
      <Button size='small' onClick={() => void edit(playerId, { restore: true })}>
        Restore
      </Button>
    </Box>
  );

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}>
      <Button size='small' onClick={() => setOpen(!open)} sx={{ m: 0.5 }}>
        {open ? '▾' : '▸'} Removed ({total})
      </Button>
      {open && (
        <>
          {kept.map((r) => line(String(r.playerId), r.playerId, r.name, r.removedAt!, r.stage))}
          {idsOnly.map(([id, removed]) => line(`id-${id}`, Number(id), `player #${id}`, removed.at))}
        </>
      )}
    </Box>
  );
};

interface RecruitsViewProps {
  book: RecruitBook;
}

/**
 * The Recruits tab: the candidates themselves, and a Diagnostics subtab with anything that went
 * wrong along the way, kept so it can be copied out and reported.
 */
export const RecruitsView: React.FC<RecruitsViewProps> = ({ book }) => {
  const [subtab, setSubtab] = React.useState<'list' | 'diagnostics'>('list');
  const problems = book.diagnostics?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Tabs value={subtab} onChange={(_, value: 'list' | 'diagnostics') => setSubtab(value)} sx={{ minHeight: 32 }}>
        <Tab value='list' label='Recruits' sx={{ minHeight: 32, py: 0 }} />
        <Tab
          value='diagnostics'
          label={problems ? `Diagnostics (${problems})` : 'Diagnostics'}
          sx={{ minHeight: 32, py: 0, color: problems ? 'error.main' : undefined }}
        />
      </Tabs>
      {subtab === 'list' ? <RecruitList book={book} /> : <RecruitDiagnostics book={book} />}
    </Box>
  );
};

/**
 * Candidate recruits: players past chapter 4 in no fellowship, picked up from neighbours, visits,
 * KP hunt ranking pages and wonders, and messages. Each gets an activity verdict from what has
 * been seen of them over the window, and a stage that tracks how recruiting them is going.
 */
const RecruitList: React.FC<RecruitsViewProps> = ({ book }) => {
  const store = getOverlayStore();
  const windowDays = store((state) => state.recruitWindowDays);
  const setWindowDays = store((state) => state.setRecruitWindowDays);
  const minSigns = store((state) => state.recruitMinSigns);
  const setMinSigns = store((state) => state.setRecruitMinSigns);
  const autoRefresh = store((state) => state.autoRefreshRecruits ?? false);
  const setAutoRefresh = store((state) => state.setAutoRefreshRecruits);
  const autoElvenStats = store((state) => state.autoElvenStats ?? false);
  const setAutoElvenStats = store((state) => state.setAutoElvenStats);
  const [filter, setFilterState] = React.useState<Filter>('qualified');
  // Hundreds of rows at once made the tab crawl, so they are drawn a page at a time.
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const setFilter = (next: Filter) => {
    setFilterState(next);
    setLimit(PAGE_SIZE);
  };
  const [expandedIds, setExpandedIds] = React.useState<ReadonlySet<number>>(new Set());
  const toggleExpanded = React.useCallback(
    (playerId: number) =>
      setExpandedIds((ids) => {
        const next = new Set(ids);
        if (!next.delete(playerId)) {
          next.add(playerId);
        }
        return next;
      }),
    [],
  );
  // Verdicts age with the clock, so they are worked out again every minute as well as on change.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const settings = React.useMemo(() => ({ windowDays, minSigns }), [windowDays, minSigns]);

  const rows = React.useMemo(
    () =>
      Object.values(book.recruits)
        .filter((recruit) => recruit.removedAt === undefined)
        .map((recruit) => ({
          recruit,
          filter: filterOf(recruit),
          verdict: activityVerdict(recruit, settings, now),
          signs: activitySignList(recruit, settings, now),
          fellowship: fellowshipProfile(recruit, now),
          score: describeScore(recruit),
        })),
    [book, settings, now],
  );

  const counts = rows.reduce<Record<Filter, number>>((acc, row) => ({ ...acc, [row.filter]: acc[row.filter] + 1 }), {
    qualified: 0,
    unverified: 0,
    inProgress: 0,
    closed: 0,
  });

  // The conversations under way come newest first, so whoever just wrote is at the top; the rest
  // by how promising they are.
  const lastMessage = (recruit: Recruit) => recruit.lastMessageAt ?? recruit.contactedAt ?? 0;
  const shown = rows
    .filter((row) => row.filter === filter)
    .sort((a, b) =>
      filter === 'inProgress'
        ? lastMessage(b.recruit) - lastMessage(a.recruit)
        : VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
          fellowshipOrder(a.fellowship) - fellowshipOrder(b.fellowship) ||
          b.signs.length - a.signs.length ||
          b.recruit.lastSeen - a.recruit.lastSeen,
    );

  const numberField = (label: string, value: number, set: (n: number) => void, min: number) => (
    <TextField
      size='small'
      type='number'
      label={label}
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n) && n >= min) set(n);
      }}
      onKeyDown={keepKeysFromGame}
      onKeyUp={keepKeysFromGame}
      slotProps={{ htmlInput: { min } }}
      sx={{ width: 90 }}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, p: 1 }}>
        <ToggleButtonGroup
          size='small'
          exclusive
          value={filter}
          onChange={(_, v: Filter | null) => v && setFilter(v)}
          sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25, fontSize: '0.7rem', lineHeight: 1.4 } }}
        >
          <ToggleButton value='qualified'>Candidates ({counts.qualified})</ToggleButton>
          <ToggleButton value='inProgress'>In progress ({counts.inProgress})</ToggleButton>
          <ToggleButton value='closed'>Closed ({counts.closed})</ToggleButton>
          <ToggleButton value='unverified'>Unk. ({counts.unverified})</ToggleButton>
        </ToggleButtonGroup>
        <Button size='small' disabled={expandedIds.size === 0} onClick={() => setExpandedIds(new Set())}>
          Collapse all
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title='Active means at least this many signs (score changes up or down, messages, neighbourly help and other notifications from them) within this many days'>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {numberField('Signs', minSigns, setMinSigns, 1)}
            {numberField('Days', windowDays, setWindowDays, 1)}
          </Box>
        </Tooltip>
        {book.scoreRefreshOff ? (
          <Tooltip title={`Stopped after a problem: ${book.scoreRefreshOff.reason}. See Diagnostics.`}>
            <Chip size='small' color='error' label='Auto refresh stopped' />
          </Tooltip>
        ) : (
          <Tooltip title="Reads one open candidate's score every 90 seconds, each at most twice a day">
            <FormControlLabel
              control={<Switch size='small' checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
              label='Auto refresh'
            />
          </Tooltip>
        )}
        {book.elvenStatsOff ? (
          <Tooltip title={`Stopped after a problem: ${book.elvenStatsOff.reason}. See Diagnostics.`}>
            <Chip size='small' color='error' label='ElvenStats stopped' />
          </Tooltip>
        ) : (
          <Tooltip title='Asks ElvenStats about one open candidate a minute, each at most once a day'>
            <FormControlLabel
              control={
                <Switch
                  size='small'
                  checked={autoElvenStats}
                  disabled={!book.server}
                  onChange={(e) => setAutoElvenStats(e.target.checked)}
                />
              }
              label='ElvenStats'
            />
          </Tooltip>
        )}
      </Box>
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {shown.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ p: 2, textAlign: 'center' }}>
            {filter === 'qualified'
              ? 'No candidates yet. They are picked up from your neighbours, the cities you visit, KP hunt ranking pages and wonders, and your messages.'
              : filter === 'unverified'
                ? 'Nobody whose chapter is still unknown. Visiting a city shows its chapter; a score above 100k is taken as chapter 5 or later.'
                : filter === 'inProgress'
                  ? 'Nobody contacted yet.'
                  : 'Nobody closed off yet.'}
          </Typography>
        ) : (
          shown
            .slice(0, limit)
            .map((row) => (
              <RecruitRow
                key={row.recruit.playerId}
                recruit={row.recruit}
                verdict={row.verdict}
                signs={row.signs}
                fellowship={row.fellowship}
                now={now}
                settings={settings}
                score={row.score}
                server={book.server}
                elvenStatsOff={!!book.elvenStatsOff}
                expanded={expandedIds.has(row.recruit.playerId)}
                onToggle={toggleExpanded}
              />
            ))
        )}
        {shown.length > limit && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, p: 1 }}>
            <Typography variant='caption' color='text.secondary'>
              Showing {limit} of {shown.length}
            </Typography>
            <Button size='small' onClick={() => setLimit(limit + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, shown.length - limit)} more
            </Button>
          </Box>
        )}
        {filter === 'closed' && <RemovedSection book={book} />}
      </Box>
    </Box>
  );
};
