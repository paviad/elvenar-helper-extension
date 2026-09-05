import { MessageResponse } from '../chrome/messages';
import { getAccountById, loadAccount } from '../elvenar/accountStore';
import { ElvenStatsShapeError, fetchElvenStats, parseElvenStats, requestElvenStatsRefresh } from './elvenStats';
import { describeForDiagnostics, Me, recordDiagnostic, recordElvenStats, recordElvenStatsProblem } from './recruitBook';
import { withRecruitBook } from './recruitStore';

/**
 * Asks ElvenStats about one candidate and files the answer with them. Runs in the service worker,
 * which has the host permission and is the book's one writer. Nothing is sent once the lookups
 * have been stopped; any failure stops them and is kept on the Diagnostics tab.
 */
export const lookUpElvenStats = async (accountId: string, playerId: number): Promise<MessageResponse> => {
  const state = await withRecruitBook(accountId, (book) => ({
    server: book.server,
    off: book.elvenStatsOff,
    tracked: !!book.recruits[String(playerId)],
  }));
  if (state.off) {
    return { success: false, message: 'ElvenStats lookups are stopped; see Diagnostics' };
  }
  if (!state.tracked) {
    return { success: false, message: 'Not a candidate' };
  }
  if (!state.server) {
    return { success: false, message: 'The game world is not known yet' };
  }

  await loadAccount(accountId);
  const userData = getAccountById(accountId)?.cityQuery?.userData;
  const me: Me = { playerId: userData?.player_id, guildId: userData?.guild_info?.id || undefined };

  let body: string | undefined;
  try {
    body = await fetchElvenStats(state.server, playerId);
    const parsed = parseElvenStats(body, playerId, Date.now());
    await withRecruitBook(accountId, (book) => recordElvenStats(book, playerId, parsed.reading, parsed, me));
    return { success: true };
  } catch (error) {
    console.warn('recruits: ElvenStats lookup failed for', playerId, error);
    const message =
      error instanceof ElvenStatsShapeError
        ? `${error.message} (player ${playerId})`
        : `${error instanceof Error ? error.message : String(error)} (player ${playerId})`;
    await withRecruitBook(accountId, (book) =>
      recordElvenStatsProblem(book, {
        at: Date.now(),
        where: 'ElvenStats',
        message,
        detail: describeForDiagnostics({
          error: describeForDiagnostics(error),
          body: (body ?? (error as { body?: string })?.body)?.slice(0, 1000),
        }),
      }),
    );
    return { success: false, message };
  }
};

/**
 * "Refresh and recheck": asks ElvenStats to rescan one candidate, waits for the rescan, then looks
 * them up as usual. Only ever sent from a click on one candidate, never by the automatic lookups.
 *
 * A refresh that fails is kept on the Diagnostics tab but does not stop the automatic lookups:
 * the endpoint is a different one, and a single refused rescan says little about reading.
 */
export const refreshAndRecheckElvenStats = async (accountId: string, playerId: number): Promise<MessageResponse> => {
  const server = await withRecruitBook(accountId, (book) =>
    book.elvenStatsOff || !book.recruits[String(playerId)] ? undefined : book.server,
  );
  if (!server) {
    return { success: false, message: 'ElvenStats lookups are stopped, or the game world is not known yet' };
  }

  try {
    const refused = await requestElvenStatsRefresh(server, playerId);
    if (refused) {
      return { success: false, message: refused };
    }
  } catch (error) {
    console.warn('recruits: ElvenStats refresh failed for', playerId, error);
    const message = `${error instanceof Error ? error.message : String(error)} (player ${playerId})`;
    await withRecruitBook(accountId, (book) =>
      recordDiagnostic(
        book,
        {
          at: Date.now(),
          where: 'ElvenStats refresh',
          message,
          detail: describeForDiagnostics({
            error: describeForDiagnostics(error),
            body: (error as { body?: string })?.body,
          }),
        },
        false,
      ),
    );
    return { success: false, message };
  }

  return lookUpElvenStats(accountId, playerId);
};
