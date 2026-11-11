import React from 'react';
import { ExtensionTabPage } from '../chrome/messages';

/** Something the player may want to know that belongs to no tab, counted on the title bar's bell. */
export interface OverlayNotice {
  title: string;
  /** What to do about it. */
  detail?: string;
  /** The page of the extension's tab that clicking the notice opens. */
  page?: ExtensionTabPage;
}

/** The notices up now, by who put them up. A source has one notice at a time. */
const bySource = new Map<string, OverlayNotice>();
const listeners = new Set<() => void>();
/** Kept between changes, so a reader sees the same list until something changes it. */
let notices: OverlayNotice[] = [];

/** Puts a source's notice up, in place of the one it had, or takes it down when there is none. */
export const setOverlayNotice = (source: string, notice: OverlayNotice | undefined) => {
  if (!notice && !bySource.has(source)) {
    return;
  }
  if (notice) {
    bySource.set(source, notice);
  } else {
    bySource.delete(source);
  }
  notices = [...bySource.values()];
  listeners.forEach((listener) => listener());
};

export const getOverlayNotices = () => notices;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The notices up now, redrawn as they come and go. */
export const useOverlayNotices = () => React.useSyncExternalStore(subscribe, getOverlayNotices);
