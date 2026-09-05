import React from 'react';
import '../chrome/recruitMessages';
import { sendRuntime } from '../chrome/messages';
import { ConnectionFailureMessage } from '../inject/gameState';
import { RecruitDiagnosticMessage } from '../inject/local/localRecruitScore';
import { relayToGame } from '../inject/relayToGame';
import { nextElvenStatsLookup, nextScoreRefresh, RecruitBook, RecruitDiagnostic } from '../recruits/recruitBook';
import { getGameState } from './gameStateWatch';
import { getAccountId } from './overlayStore';

/** How often one candidate's score is read while the refresher is on. */
export const RECRUIT_REFRESH_INTERVAL_MS = 90 * 1000;

/** A score read more recently than this is left alone. */
export const RECRUIT_SCORE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** How long an answer gets before its absence is taken as the lookup not working. */
export const RECRUIT_SCORE_ANSWER_MS = 2 * 60 * 1000;

/** Hands a diagnostic to the service worker, which keeps it and, unless told not to, stops the refresher. */
const reportDiagnostic = (diagnostic: RecruitDiagnostic, stopRefresh = true) => {
  const accountId = getAccountId();
  if (accountId) {
    void sendRuntime('recordRecruitDiagnostic', { accountId, diagnostic, stopRefresh });
  }
};

/** `14:03:06` - when the last lookup was answered, for the diagnostic. */
const clockTime = (at: number) => new Date(at).toTimeString().slice(0, 8);

/**
 * While `on`, reads the score of one open candidate every {@link RECRUIT_REFRESH_INTERVAL_MS},
 * stalest first, skipping any read in the last {@link RECRUIT_SCORE_MAX_AGE_MS}. That is the
 * request the game makes when you open someone's profile, sent slowly enough to look like it.
 * Holds off while the game is past talking to; the page turns those away too.
 *
 * The lookup is ours rather than the game's, so it is treated warily: the first sign of it not
 * working - the page failing to send it, an answer that does not fit, or no answer at all - is
 * kept as a diagnostic and nothing more is sent until the diagnostics are cleared by hand.
 */
export const useRecruitRefresher = (book: RecruitBook, on: boolean) => {
  const bookRef = React.useRef(book);
  React.useEffect(() => {
    bookRef.current = book;
  }, [book]);
  // Who was asked about when, so an unanswered request is not repeated until the score is due again.
  const askedAt = React.useRef(new Map<number, number>());

  // The page reports its own failures by message, since it cannot reach the extension itself. A
  // failed connection is kept whether or not the refresher is on, with what the game had just sent:
  // it says what was on the wire, which is what tells a lookup's fault from anything else's.
  React.useEffect(() => {
    const onMessage = (event: MessageEvent<RecruitDiagnosticMessage | ConnectionFailureMessage>) => {
      if (event.source !== window) {
        return;
      }
      if (event.data?.type === 'recruitDiagnostic') {
        reportDiagnostic({ at: Date.now(), ...event.data.payload });
      } else if (event.data?.type === 'connectionFailure') {
        const { why, at, recentBatches } = event.data.payload;
        reportDiagnostic(
          {
            at,
            where: 'game connection',
            message: `The game's connection failed: ${why}`,
            detail: `What the game had sent, oldest first:\n${recentBatches || '(nothing recorded)'}`,
          },
          false,
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  React.useEffect(() => {
    if (!on) {
      return;
    }
    const answerChecks = new Set<ReturnType<typeof setTimeout>>();

    const checkAnswered = (playerId: number, name: string, sentAt: number) => {
      const current = bookRef.current;
      const recruit = current.recruits[String(playerId)];
      // Already stopped, or the candidate was removed meanwhile: neither says anything about the lookup.
      if (current.scoreRefreshOff || !recruit || (recruit.scoreCheckedAt ?? 0) >= sentAt) {
        return;
      }
      // A connection that failed meanwhile is why no answer came, and says nothing on its own about
      // the lookup; the "game connection" entry beside it shows what was on the wire at the time.
      const state = getGameState();
      const lookups = current.scoreLookups;
      const record = lookups
        ? `${lookups.answered} lookups answered since ${new Date(lookups.since).toLocaleString()}` +
          (lookups.lastAnsweredAt ? `, the last at ${clockTime(lookups.lastAnsweredAt)}` : '')
        : 'no lookup answered yet';
      reportDiagnostic({
        at: Date.now(),
        where: 'score lookup (no answer)',
        message: state?.unusable
          ? `No score came back for ${name} (${playerId}): the game's connection failed after the lookup was sent (${state.unusable}). ${record}.`
          : `No score came back for ${name} (${playerId}) within ${RECRUIT_SCORE_ANSWER_MS / 1000} seconds. ${record}.`,
        detail: JSON.stringify({
          playerId,
          sentAt: new Date(sentAt).toISOString(),
          gameState: state,
          scoreLookups: lookups,
        }),
      });
    };

    const tick = () => {
      if (bookRef.current.scoreRefreshOff) {
        return;
      }
      const state = getGameState();
      if (state?.unusable || state?.loading) {
        return;
      }
      const olderThan = Date.now() - RECRUIT_SCORE_MAX_AGE_MS;
      const due = nextScoreRefresh(bookRef.current, olderThan, (id) => (askedAt.current.get(id) ?? 0) >= olderThan);
      if (!due) {
        return;
      }
      const sentAt = Date.now();
      askedAt.current.set(due.playerId, sentAt);
      console.log('recruits: reading the score of', due.name);
      relayToGame('recruitScore', due.playerId);
      const check = setTimeout(() => {
        answerChecks.delete(check);
        checkAnswered(due.playerId, due.name, sentAt);
      }, RECRUIT_SCORE_ANSWER_MS);
      answerChecks.add(check);
    };

    tick();
    const timer = setInterval(tick, RECRUIT_REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      answerChecks.forEach(clearTimeout);
    };
  }, [on]);
};

/** How often one candidate is looked up on ElvenStats while the lookups are on. */
export const ELVENSTATS_INTERVAL_MS = 60 * 1000;

/** An ElvenStats answer younger than this is not asked for again. They scan every few hours. */
export const ELVENSTATS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * While `on`, asks ElvenStats about one open candidate a minute, the one asked longest ago, and
 * nobody twice in {@link ELVENSTATS_MAX_AGE_MS}. The service worker does the fetching, and stops
 * the lookups itself on the first problem; this only stops sending once it has.
 */
export const useElvenStatsRefresher = (book: RecruitBook, on: boolean) => {
  const bookRef = React.useRef(book);
  React.useEffect(() => {
    bookRef.current = book;
  }, [book]);
  const askedAt = React.useRef(new Map<number, number>());

  React.useEffect(() => {
    if (!on) {
      return;
    }
    const tick = () => {
      const accountId = getAccountId();
      if (!accountId || bookRef.current.elvenStatsOff) {
        return;
      }
      const olderThan = Date.now() - ELVENSTATS_MAX_AGE_MS;
      const due = nextElvenStatsLookup(bookRef.current, olderThan, (id) => (askedAt.current.get(id) ?? 0) >= olderThan);
      if (due) {
        askedAt.current.set(due.playerId, Date.now());
        console.log('recruits: asking ElvenStats about', due.name);
        void sendRuntime('lookUpElvenStats', { accountId, playerId: due.playerId });
      }
    };
    tick();
    const timer = setInterval(tick, ELVENSTATS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [on]);
};
