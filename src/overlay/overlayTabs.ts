/**
 * The overlay's tabs, in one place, so the tab bar, the Alt+C chord map and the help dialog all
 * describe the same thing. They used to be declared apart, and the help text fell out of date.
 */
export type OverlayTabKey = 'chat' | 'trade' | 'ee' | 'quests' | 'messages' | 'tourny' | 'kphunt' | 'nhelp';

export interface OverlayTab {
  key: OverlayTabKey;
  label: string;
  /** Second key of the Alt+C chord. Tabs without one are mouse-only. */
  shortcut?: string;
  isNew?: boolean;
  /** One line for the help dialog. A tab without one is left out of it entirely. */
  help?: string;
  /** Only shown from this chapter on. */
  fromChapter?: number;
}

export const OVERLAY_TABS: OverlayTab[] = [
  {
    key: 'chat',
    label: 'Chat',
    shortcut: 'KeyC',
    help: 'Your fellowship chat, searchable, kept for 30 days.',
  },
  {
    key: 'trade',
    label: 'Trade',
    fromChapter: 18,
    help: 'Trade offers worth taking. Appears from chapter 18.',
  },
  {
    key: 'ee',
    label: 'EE',
    shortcut: 'KeyE',
    help: 'Cultural buildings still missing an Ensorcelled Endowment, with their grid coordinates.',
  },
  {
    key: 'quests',
    label: 'Quests',
    shortcut: 'KeyQ',
    help: 'Drop in a quest export and browse the event’s quest list.',
  },
  {
    key: 'messages',
    label: 'Messages',
    shortcut: 'KeyM',
    isNew: true,
    help: 'Inbox and outbox with search, plus Swaps: your knowledge point debts, tallied from the threads you post in.',
  },
  {
    key: 'tourny',
    label: 'Tourny',
    shortcut: 'KeyT',
    isNew: true,
    help: 'A counter composition for every tournament province you open, and what to train for the round ahead.',
  },
  // Deliberately undocumented, so the help dialog reads the same here as everywhere else.
  {
    key: 'kphunt',
    label: 'KP Hunt',
    shortcut: 'KeyK',
  },
  {
    key: 'nhelp',
    label: 'N.Help',
    shortcut: 'KeyN',
  },
];

/** The Trade tab only exists once the chapter unlocks it. */
export const visibleOverlayTabs = (chapter: number) =>
  OVERLAY_TABS.filter((tab) => tab.fromChapter === undefined || chapter >= tab.fromChapter);

/** What the help dialog lists, which is only ever the tabs that describe themselves. */
export const documentedOverlayTabs = () =>
  OVERLAY_TABS.filter((tab): tab is OverlayTab & { help: string } => !!tab.help);

/** `KeyT` reads as `T` — the chord hint shown to the player. */
export const shortcutLetter = (shortcut: string) => shortcut.replace(/^Key/, '');
