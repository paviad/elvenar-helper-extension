import React from 'react';
import { getFromStorage } from '../chrome/storage';
import { emptyRecruitBook, RecruitBook } from '../recruits/recruitBook';
import { parseRecruitBook, recruitBookKey } from '../recruits/recruitStore';

/**
 * An account's recruits, as the service worker last saved them. Read straight from storage and
 * kept current by watching the key, since the worker is the only writer and saves after every
 * change; the overlay never writes it, it asks the worker to.
 */
export const useRecruitBook = (accountId: string | null | undefined): RecruitBook => {
  // Held with the account it was read for, so switching accounts never shows the last one's book.
  const [held, setHeld] = React.useState<{ accountId: string; book: RecruitBook } | undefined>(undefined);

  React.useEffect(() => {
    if (!accountId) {
      return;
    }
    const key = recruitBookKey(accountId);
    let previous: RecruitBook | undefined;
    const setBook = (book: RecruitBook) => {
      previous = keepUnchanged(previous, book);
      setHeld({ accountId, book: previous });
    };
    let live = true;
    getFromStorage(key)
      .then((raw) => live && setBook(parseRecruitBook(raw)))
      .catch((error: unknown) => console.log('recruits: could not read the book', error));

    // A KP hunt saves the book after every ranking page, so saves come in bursts. Only the last of
    // a burst is read, once they pause.
    let pending: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !(key in changes)) {
        return;
      }
      pending = changes[key].newValue as string | undefined;
      clearTimeout(timer);
      timer = setTimeout(() => live && setBook(parseRecruitBook(pending)), READ_DELAY_MS);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      live = false;
      clearTimeout(timer);
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [accountId]);

  return held && held.accountId === accountId ? held.book : EMPTY_BOOK;
};

/** How long saves have to pause before the book is read again. */
const READ_DELAY_MS = 500;

/**
 * The new book, but holding on to each candidate from the previous one whose data has not changed.
 * The rows only draw again for a candidate that is a different object, so without this every save
 * redrew every row - hundreds of them - however little it changed.
 */
export const keepUnchanged = (previous: RecruitBook | undefined, next: RecruitBook): RecruitBook => {
  if (!previous) {
    return next;
  }
  const recruits: RecruitBook['recruits'] = {};
  for (const [id, recruit] of Object.entries(next.recruits)) {
    const before = previous.recruits[id];
    recruits[id] = before && JSON.stringify(before) === JSON.stringify(recruit) ? before : recruit;
  }
  return { ...next, recruits };
};

/** One empty book for every render that has none, so nothing downstream sees a new object. */
const EMPTY_BOOK = emptyRecruitBook();
