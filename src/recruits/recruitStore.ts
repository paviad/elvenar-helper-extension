import { getFromStorage, saveToStorage } from '../chrome/storage';
import { emptyRecruitBook, pruneRecruitBook, Recruit, RecruitBook } from './recruitBook';

/** Where an account's recruits are stored. Read by the overlay, written only by the service worker. */
export const recruitBookKey = (accountId: string) => `recruits_${accountId}`;

export const parseRecruitBook = (raw: string | null | undefined): RecruitBook => {
  if (!raw) {
    return emptyRecruitBook();
  }
  try {
    const parsed = JSON.parse(raw) as RecruitBook;
    if (!parsed?.recruits) {
      return emptyRecruitBook();
    }
    upgradeActivity(parsed);
    return parsed;
  } catch {
    return emptyRecruitBook();
  }
};

/**
 * Books saved before moments of activity had a kind kept bare timestamps, in `activityAt`. Those
 * become moments of kind `other`, since what each one was is no longer known.
 */
const upgradeActivity = (book: RecruitBook) => {
  for (const recruit of Object.values(book.recruits)) {
    const legacy = recruit as Recruit & { activityAt?: number[] };
    if (!recruit.activity) {
      recruit.activity = (legacy.activityAt ?? []).map((at) => ({ at, kind: 'other' as const }));
    }
    delete legacy.activityAt;
  }
};

const books = new Map<string, RecruitBook>();

/**
 * Changes are queued one after another: game responses and the overlay's edits both come through
 * here, and two of them interleaving across the read and the write would lose one.
 */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs `change` on an account's recruits and saves them when it says something changed. Runs in
 * the service worker only, the one context that writes the book, so the copy held here is the
 * truth and storage is only read the first time an account is touched after the worker wakes.
 */
export const withRecruitBook = <T>(accountId: string, change: (book: RecruitBook) => T): Promise<T> => {
  const run = async () => {
    let book = books.get(accountId);
    if (!book) {
      book = parseRecruitBook(await getFromStorage(recruitBookKey(accountId)));
      books.set(accountId, book);
    }
    const before = JSON.stringify(book);
    const result = change(book);
    pruneRecruitBook(book);
    const after = JSON.stringify(book);
    if (after !== before) {
      await saveToStorage(recruitBookKey(accountId), after);
    }
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
};
