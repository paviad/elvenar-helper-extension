# Changelog

## Unreleased
- **New Feature: Tourny** — Added a "Tourny" tab to the in-game overlay that works out what to field against each tournament province, and what to train for the round ahead. Reachable with the chord Alt+C, T.
- **Counters:** Open a province on the Tournament Map in game and the tab suggests a squad for it — a blend across the five slots rather than five of a single unit, because the game accepts five different types, each sized by its own unit weight.
- Suggestions are read from the game's own battle balancing data, so they follow the real counter values for your units at the levels you have unlocked, rather than a fixed table.
- Where your troops cannot field the best answer, both are shown: the ideal composition to train towards, with what you hold set against what it asks for, and the strongest one you can actually field today.
- Each province shows its enemy lineup, how many of the five enemies your squad answers, and a grade for how well it does so.
- **Prep:** A briefing for the tournament running now and for the one coming next, switchable between the two — the enemy classes it favours, what to train from each of your military buildings with your current stock beside it, and battle tips.
- The tournament coming next is worked out from the fixed rotation (Marble, Steel, Planks, Crystal, Scrolls, Silk, Elixir, Magic Dust, Gems). The most recent one seen is remembered, so the rotation still names the next one between rounds.
- Training advice names your own units rather than the names in the guide, which change as units are promoted — so it points at the Divine Vallorian Guard you have, not the Vallorian Guard you had.
- Tournament guidance is distilled from a player guide by Sapphyre (Beta), Queen of Kelp Islands (Arendyll) and KibbleKat (Arendyll), credited in the tab and in the help dialog.
- **Help dialog** — Rebuilt around the panel list itself, so it stays current: every panel with its keyboard chord, and a short list of what is reached from elsewhere. It also opens in front of the helper window rather than behind it.
- **Panel size is remembered** — Resize the helper window by its bottom-right corner and it opens at that size next time, instead of going back to the default on every page load.
- A new button in the overlay header resets the panel to one of two sizes: Small (400 × 600), the size the panel has settled at in practice, or Large (630 × 800), which fits the Chat, Messages and Swaps views comfortably. The size in use is ticked.
- The saved size is per browser, not per account, and only your own resizes are saved — a view that grows the panel to fit itself does not overwrite the size you chose.
- **New Feature: Swaps** — Added a "Swaps" button to the Messages tab, alongside Inbox and Outbox, that tallies your knowledge point swap debts automatically.
- Post exactly "&lt;Ancient Wonder&gt; please" in a swap thread and whoever posted before you is added to the list, with the amount read from the thread title and the wonder they asked for.
- Wonder names come from the game's own building catalog, so they match whatever language you play in.
- A button in the Swaps header lists the ancient wonders standing in your city and copies "&lt;wonder&gt; please" to the clipboard, so the exact wording is never mistyped. It stays behind a button rather than taking up room in the list.
- Amounts are read from the number next to "KP" in the title, handling the usual spread of thread names ("60 KP Thread", "10KP SWAP THREAD - AUGUST"). Titles with no readable amount, or two of them, are listed separately instead of being counted.
- The list starts empty and fills only as you post, so rounds you did before enabling it are left alone. Tick rows off as you donate to keep your place, then use "Clear all" once you have repaid everybody — clearing is manual, since the extension can see your posts but not your donations.
- Debts are grouped by the player you owe, since the same player can come up in several threads and you repay them in one visit. Each card shows what they are owed in total, broken down per thread with the wonder each one asked for.
- Consecutive posts of your own count as changing your mind about which wonder you want, not as a second debt.
- Reachable through the existing Messages chord (Alt+C, M), then the Swaps button.

## v8.9.0
- **New Feature: Messages** — Added a "Messages" tab to the in-game overlay for browsing your Inbox and Outbox. Includes a thread list with unread indicators and previews, a master/detail thread view (most recent first), and collapsible recipients.
- **Search:** Filter threads by any term and jump between every match with next/previous and a running match count; matches are highlighted inside the thread.
- Read status stays in sync: marking a message as read in the game clears its unread indicator here.
- Replies posted in the game appear in the thread automatically.
- Messages are captured live from the game and saved per-account (no history kept — the latest data overwrites the previous snapshot).
- Shows a "saved view" notice until you open the in-game Messages window, since the game only sends message data when its icon is clicked.
- Keyboard chord navigation (Alt+C, M) to jump straight to the Messages tab.
- Message text now preserves line breaks and blank lines.

## v5.9.0
- **Inventory:** Added "Copy Table" button to export inventory as tab-separated values (TSV) for easy spreadsheet use.
- **Inventory:** Spell Fragments now scale with Magic Academy level; improved chapter/level detection for reward kits.

## v5.8.0
- **Main Feature:** Added padding around the city grid, allowing players to place buildings in a "temporary area" for easier relocation and city planning.
- **Secondary Feature:** Improved grid visualization and introduced an isometric view option for enhanced city layout clarity.
- Standardized code style: unified quote usage and improved formatting across TypeScript files.
- Refactored and reordered imports for better maintainability.
- Overlay store: added `viewMode` and `setViewMode` for grid visualization control.
- Made `guild_info` optional in user and player data models to prevent errors.
- UI/UX: Improved dialog and button rendering, and fixed background color logic in chat messages.
- Removed unused utility: `normalizeString.ts`.

## v5.7.0
- Indicate max building level for city chapter

## v5.6.0
- Show city provided vs required resources (culture, population, prosperity)

## v5.5.0
- New feature: Build menu (Alt+B)

## v5.4.0
- Performance optimizations

## v5.3.0
- Show stage on evolving buildings
- Fellowship Adventure: improved badge tracking and export features
- Added new controls to the Fellowship Adventure timeline
- Enhanced city data import/export reliability
- UI improvements for chat and overlay panels
- Various bug fixes and performance optimizations

## v5.2.1
- Fixed drag and drop data corruption bug
- While dragging, allow keyboard +, - and Del to change level or delete block

## v5.2.0
- Store visited cities
- Fellowship adventure export (work in progress)
- Ancient Wonder names obtained from goods query
- Send "mark as read" to server
- Fixed: Level change operations are no longer lost during save

## v5.1.0
- Add "jump to first unread" button to chat view
- Import/export save feature complete
- Add "next finish" to Fellowship Adventure timeline

## v5.0.1
- Only autoscroll chat to end when first expanding the panel
- Bind Alt+C by key code (removes keyboard language dependence)

## v5.0.0
- Mark all as read now also closes the overlay window
- Fellowship Adventure badge tracking
- Fixed: Chat view "mark all" and "jump to last" didn’t work properly
- Badge production timeline (work in progress)
- Show new messages separator

## v4.1.0
- Help dialog in overlay
- Compress big array in storage
- Chat message search
- Show only 30 messages by default, allow to show more (and less)
- Add Alt+C shortcut for chat view
- Add 'elvenassist-' prefix to all script names for due disclosure
- Chat view
