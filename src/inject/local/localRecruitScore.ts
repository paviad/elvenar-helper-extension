/** How the page tells the overlay the score lookup went wrong, for it to keep and stop on. */
export interface RecruitDiagnosticMessage {
  type: 'recruitDiagnostic';
  payload: { where: string; message: string; detail?: string };
}

const report = (message: string, error?: unknown) => {
  console.warn(`recruits: ${message}`, error ?? '');
  const detail =
    error instanceof Error
      ? error.stack || `${error.name}: ${error.message}`
      : error === undefined
        ? undefined
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
  window.postMessage(
    {
      type: 'recruitDiagnostic',
      payload: { where: 'score lookup (page)', message, detail },
    } satisfies RecruitDiagnosticMessage,
    '*',
  );
};

/**
 * Asks for a candidate recruit's ranking scores, the request the game makes when a profile is
 * opened. The answer goes to the service worker the usual way, through the request matcher, and
 * nothing is done with it here. Answered straight to the callback, so unlike a ranking page it
 * leaves the game's ranking window, and a KP hunt paging through it, alone.
 *
 * Anything that goes wrong is reported rather than retried: the overlay keeps it and the
 * refresher stops sending until it has been looked at.
 */
export const localRecruitScore = (playerId: number) => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.shared.ranking.service.RankingService'];
  if (!serviceConstructor) {
    report('RankingService is not available on window.aviad');
    return;
  }
  let service: InstanceType<typeof serviceConstructor>;
  try {
    service = new serviceConstructor();
  } catch (error) {
    report('Creating RankingService threw', error);
    return;
  }
  if (typeof service?.getRankingOverview !== 'function') {
    report(`RankingService has no getRankingOverview (got ${typeof service?.getRankingOverview})`);
    return;
  }
  try {
    service.getRankingOverview(playerId, () => {
      // read off the wire instead
    });
  } catch (error) {
    report(`getRankingOverview(${playerId}) threw`, error);
  }
};
