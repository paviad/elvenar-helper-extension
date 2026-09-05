import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import '../chrome/recruitMessages';
import { sendRuntime } from '../chrome/messages';
import { RecruitBook } from '../recruits/recruitBook';
import { getAccountId } from './overlayStore';

/** Day, month and time to the second, which is what matters when lining a problem up with logs. */
const stamp = (at: number) => {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Everything on this tab as one block of text, to paste back to whoever is looking into it. */
const report = (book: RecruitBook) =>
  JSON.stringify(
    {
      extensionVersion: chrome.runtime.getManifest().version,
      copiedAt: new Date().toISOString(),
      scoreRefreshOff: book.scoreRefreshOff && {
        ...book.scoreRefreshOff,
        at: new Date(book.scoreRefreshOff.at).toISOString(),
      },
      scoreLookups: book.scoreLookups && {
        ...book.scoreLookups,
        since: new Date(book.scoreLookups.since).toISOString(),
        lastAnsweredAt: book.scoreLookups.lastAnsweredAt && new Date(book.scoreLookups.lastAnsweredAt).toISOString(),
      },
      elvenStatsOff: book.elvenStatsOff && {
        ...book.elvenStatsOff,
        at: new Date(book.elvenStatsOff.at).toISOString(),
      },
      diagnostics: (book.diagnostics ?? []).map((d) => ({ ...d, at: new Date(d.at).toISOString() })),
    },
    null,
    2,
  );

interface RecruitDiagnosticsProps {
  book: RecruitBook;
}

/**
 * What went wrong while collecting recruits, newest first, and whether the score refresher has
 * been stopped because of it. Copy puts the lot on the clipboard; clearing forgets it and lets
 * the refresher run again.
 */
export const RecruitDiagnostics: React.FC<RecruitDiagnosticsProps> = ({ book }) => {
  const [copied, setCopied] = React.useState(false);
  const diagnostics = [...(book.diagnostics ?? [])].reverse();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report(book));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.log('recruits: could not copy the diagnostics', error);
    }
  };

  const clear = async () => {
    const accountId = getAccountId();
    if (accountId) {
      await sendRuntime('clearRecruitDiagnostics', { accountId });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, p: 1, gap: 1 }}>
      {book.scoreRefreshOff && (
        <Alert severity='error'>
          Auto refresh stopped {stamp(book.scoreRefreshOff.at)} and sends nothing until this is cleared:{' '}
          {book.scoreRefreshOff.reason}
        </Alert>
      )}
      {book.elvenStatsOff && (
        <Alert severity='error'>
          ElvenStats lookups stopped {stamp(book.elvenStatsOff.at)} and send nothing until this is cleared:{' '}
          {book.elvenStatsOff.reason}
        </Alert>
      )}
      {!book.scoreRefreshOff && !book.elvenStatsOff && (
        <Alert severity={diagnostics.length ? 'warning' : 'success'}>
          {diagnostics.length
            ? 'Auto refresh and the ElvenStats lookups are not affected by these.'
            : 'Nothing has gone wrong.'}
        </Alert>
      )}
      {book.scoreLookups && (
        <Typography variant='caption' color='text.secondary'>
          Score lookups answered: {book.scoreLookups.answered} since {stamp(book.scoreLookups.since)}
          {book.scoreLookups.lastAnsweredAt !== undefined && `, the last at ${stamp(book.scoreLookups.lastAnsweredAt)}`}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size='small' variant='outlined' disabled={!diagnostics.length} onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button
          size='small'
          variant='outlined'
          color='error'
          disabled={!diagnostics.length && !book.scoreRefreshOff && !book.elvenStatsOff}
          onClick={() => void clear()}
        >
          Clear and re-enable
        </Button>
      </Box>
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {diagnostics.map((d, i) => (
          <Box key={`${d.at}-${i}`} sx={{ borderBottom: 1, borderColor: 'divider', py: 0.5 }}>
            <Typography variant='body2'>
              <strong>{stamp(d.at)}</strong> · {d.where} · {d.message}
            </Typography>
            {d.detail && (
              <Typography
                variant='caption'
                component='pre'
                sx={{
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  color: 'text.secondary',
                }}
              >
                {d.detail}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
