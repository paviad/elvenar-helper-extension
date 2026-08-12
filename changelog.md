# Changelog

## Unreleased
- **City Planner: the building under the mouse is outlined, and the +/- keys act on it.** The level keys used to reach only the building you were holding, so trying a residence a level higher meant picking it up, pressing a key and putting it back down. Hovering is enough now: + and - step the level where the building stands, Shift with them steps the stage of an evolving building, and the change goes into the Move Log so Ctrl+Z takes it back. A level that grows the footprint over a neighbour hands the building to you to place instead, since the alternative is a plan with two buildings on the same tiles. The keys still belong to the building you are carrying while a drag is in progress, and are left alone while you are typing in the search box.
- **A wonder's progress keeps up with the knowledge arriving in it.** When somebody donates to one of your ancient wonders the game pushes the news down its websocket rather than answering a request with it, and the extension only ever listened to the request traffic — so the figures it held stood still until the page was reloaded. In Swaps this showed up as a wonder asking for more than it had room for. Pushed responses now take the same road as the rest, which keeps every stored figure the game pushes current, not just this one.
- The same news arriving over the game's websocket is acted on once rather than five times. The game sends a notification several times over — one contribution to a wonder arrives as five separate messages saying the same thing — and each was being processed and written to storage in full. Nothing stored was wrong, since what these carry is a state rather than a change to it, so the fifth said exactly what the first did; it was simply doing all of it five times. Frames were also being read once for every listener the game had registered, which is fixed alongside.
- **Swaps:** A request of yours that had already been answered could go on being subtracted from a wonder's room until the thread was fetched again. The mail list alone is enough to know better: a thread the game reports as having moved on has been posted in, and a post after yours is the payment.
- **Swaps:** A wonder building its new level reads "upgrading" rather than naming an amount to ask for. The game opens the next level's requirement while the building is still going up, so one you have only just finished would otherwise appear as a whole fresh round waiting to be asked for.
- **Swaps:** The Vestige of Eternity is no longer offered in the list of wonders to ask for. It is levelled by a mechanism of its own at every level, so a swap thread has nothing to give it.
- **City Planner:** The Vestige of Eternity is recognised on a translated client. It stands outside the city grid by design and was exempted from the misplaced-building check by its English name, so on any other language it was counted as out of grid and its output left out of the city totals. Both places now hold it by the game's own id.

## v10.1.0
- **Swaps:** The wonder list now shows how much knowledge each of yours has room to be asked for, so you can pick a thread it fits. Requests nobody has answered yet come off that figure first — the game counts a wonder as needing knowledge that is already on its way to you, and asking twice for the same room leaves the giver's points to overflow.
- A request counts as unanswered while yours is the last post in its thread, since the chain gives to whoever posted last. Nothing is stored, so the figure holds steady at the moment you are paid instead of jumping: the payer's post retires the request and lifts the wonder's total by the same amount.
- Copying a request pins that wonder above the debts to watch while you work through the threads; it falls as you post and reads "full" when there is no room left. Dismiss one with the cross on it, or all of them with "Clear all".
- "Clear all" in Swaps now collapses the helper window, the way "Mark all as read" does in Chat — the list is empty at that point, so the panel has nothing left to show.
- **The overlay says when it is not ready** — Collapsed, the panel was an icon and a plus whether the game had sent city data or not. An hourglass now sits in the header until the data lands, and the icon is crossed out once the extension itself is out of reach, which is what reloading, updating or disabling it does to the scripts already sitting in an open page. Until now a dead helper looked exactly like a live one.
- **City ▸ Export carries the rest of the city** — Aimed at chapter 25: the [Chapter 25 planner](https://paviad.github.io/elvenar-ch25-planner/), released alongside this, reads the file in rather than having its figures entered by hand. The export names the chapter the city is in and, alongside the layout, what you are holding: nox, sapphires, prosperity spent and unspent, the Wisdoms, time boosters by size, Generous Guests and Portal Profits. Each building says when it expires, when its enchantment runs out, and when the neighbourly help on it ends — an enchantment on an unvisited building buys nothing, so which is which matters. Stamped `schema_version: 2` with the time it was taken.
- **Tourny survives a page refresh** — Tournament data was dropped on every write, so the tab came back empty after a reload and stayed that way until the game happened to resend it. It is kept now; province information is still discarded whenever a level moves on, and upgrade timers are stored as absolute times, so a reloaded copy still counts down correctly.
- **Trade:** The tab stopped taking the panel over by itself. The game refetches the trade list on its own — while the trader is open, after an offer is posted or taken, on a re-sync — and usually gets back what it already had; the auto-open now waits for a list that actually reads differently.
- **Fellowship Adventure:** The enchantment bonus and the MM toggle are saved again. Both were written to a key nothing read back, so they returned to their defaults on every visit. Badge counts also wait for those stored values now, instead of settling on whichever of two passes — defaults or stored — happened to finish last.
- **Fellowship Adventure:** A badge the timeline has no sprite for is skipped rather than taking the whole timeline down.
- **City Planner:** Building from the inventory now works against the layout as it stands, not the one loaded when the tab opened. The empty-square count is recounted when an expansion is unlocked instead of waiting for the next building to move. And autosave writes to the account the city belongs to — switching account between a move and its save could put the new layout in the old city.
- **A bad response no longer stops everything** — One unexpected shape in the game's data would end processing for the whole session, silently, until the extension happened to restart. It now costs the single message that failed, and the message type is named in the log. The injected script also releases the requests it has finished aggregating, which it never did — a game tab left open for hours was accumulating every city map and inventory dump along the way.
- **Clicking the icon opens the city that asked for it**, rather than occasionally landing on the first city in the account list.

## v10.0.0
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

## v9.0.0
- **New Feature: Upgrade Finder** — A fourth view in the City Planner toolbar, beside Top-Down, Isometric and Table, that compares the event buildings sitting in your inventory against the ones you have placed and lists only the swaps that cannot lose. Open your in-game inventory once (the Summonings tab) so it has something to work from.
- A suggestion has to match or beat the placed building on mana, seeds, orcs, unurium, nox and culture, never cost population, and do more per square — so a larger building has to earn its extra ground. A building that trades one resource for another is not offered.
- Switchable production is respected: a building that switches between products is only replaced by one that covers every option. Set, evolving and expiring buildings already in your city are left alone, as are the ones you can simply build.
- A 1xN building is never offered in place of one that is at least two tiles on both sides, since it collects less neighbourly help.
- Every resource shows the gain per day and, underneath, the gain per square; hover a figure for the before and after it came from. Anything outside the tracked resources — coins, supplies, goods, spell fragments — is listed under each building, so a swap cannot quietly give something up.
- Evolving replacements are measured at the highest stage your artifacts can actually reach, and the row says which: "Stage 1 to 5 (max)" against "Stage 1 to 3 of 10".
- The Size column is coloured by fit — green where the replacement drops into the footprint it inherits, red where it grows — and sorting it puts the swaps that keep the footprint first.
- Group the rows by either the placed building or the inventory item; each copy groups on its own, so two of the same building can be dealt with separately.
- **Replace** removes the placed building and hands you the replacement ready to position, at the evolved stage the row was compared at. The vacated squares are marked in red and the view jumps there at 1:1. Placing it is yours, as is making room when it is larger — nothing changes in your real city.
- **Unlock expansions from the planner** — Edit ▸ Unlock Area shades the locked 5×5 expansions and lets you click one to unlock it; right-clicking a locked expansion offers the same action. It goes through the move log, undo/redo and autosave like any other edit.
- **City toolbar reorganised** — File and delete actions collapsed into a City menu, and the actions that change the city's contents into a separate Edit menu.
- **Messages:** A reply posted in the game now appears in the thread automatically, and the thread sorts back to the top.
- **A drag no longer redraws the city** — Dragging a block re-renders that block instead of every block on the grid, with the whole-city derivations and per-block catalog lookups kept off the drag path entirely.
- The upgrade list keeps its table headers live while rows are recomputed, and shows progress while regrouping, so a long recount no longer looks like a freeze.
- NEW badges retired from the older features, and moved onto the City tab and Help while the Upgrade Finder is new.

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
