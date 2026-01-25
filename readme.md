# ElvenAssist - Unofficial City Planner for Elvenar

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/kikdpnpfhakidgkojboebobjlknflilc)](https://chromewebstore.google.com/detail/kikdpnpfhakidgkojboebobjlknflilc?utm_source=item-share-cb)
[![Firefox Add-On](https://img.shields.io/amo/v/elven-assist)](https://addons.mozilla.org/en-US/firefox/addon/elven-assist/)
[![Safari Add-On](https://img.shields.io/itunes/v/com.paviad.elven-assist)](https://apps.apple.com/us/app/elvenassist/id6470343360)

> **⚠️ UNOFFICIAL FAN PROJECT**
>
> ElvenAssist is a fan-made tool. It is **not** affiliated with, endorsed by, or supported by InnoGames GmbH.

## Overview

ElvenAssist is a browser extension designed to modernize your experience with the Elvenar browser game. Whether you are struggling to fit new buildings from Chapter 24 or trying to optimize your Ascended Goods trades, this extension integrates directly with the game to give you the live data you need, right when you need it.

It replaces outdated external planning sites with a seamless, in-browser experience that runs entirely locally on your machine.

## 🚀 Key Features

### 1. Next-Generation City Planner
Stop relying on manual exports. Our City Block Editor reads your layout directly from the game and presents it on an interactive 2D grid.
- **Live Data Sync**: No need to manually "export" or "upload" your city. The extension sees what you have built instantly.
- **Up-to-Date Support**: Fully compatible with **Chapter 23 & 24**. Plan your endgame city with the correct building sizes and assets.
- **Sandbox Mode**: Experiment safely. Move, add, and remove buildings on the grid to find the perfect fit before you move a single tile in the real game.
- **Standalone Detector**: Easily spot which buildings have lost their street connection to the Main Hall.
- **Building Finder**: Lost a culture building in your dense layout? Use the Search feature to locate any structure instantly.
- **Chapter Overlays**: Automatically overlays Chapter numbers on culture and residential blocks.
- **Build Menu**: Can add any building from the game to your city from the build menu.

### 2. 🗺️ Fellowship Adventure
Master the FA with real-time data.
- **Badge Tracking**: Know exactly which badges you have ready and what is currently being produced.
- **Production Timeline**: Visualizes exactly when your workshops and manufactories will finish their current production cycles, so you can plan your collections perfectly.

### 3. 🎒 Advanced Inventory Management
The in-game inventory can be difficult to navigate. We provide a powerful alternative:
- **Search & Filter**: Instantly find that one specific event building or instant you earned months ago.
- **Smart Sorting**: Organize your inventory by chapter, type, or resale resources to decide what to place next.

### 4. ⚖️ Trade Helper
Don't miss out on profit. The extension automatically scans the trade window to detect lucrative opportunities—specifically trades offering non-boosted ascended goods in exchange for your boosted ones.

### 5. 💬 Chat History
A persistent view of your fellowship chat, making it easy to find lost messages or instructions from leadership.

## Installation

### Chrome / Edge / Brave
Install the latest stable version directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/kikdpnpfhakidgkojboebobjlknflilc?utm_source=item-share-cb).

### Firefox
Install from [Firefox Add-Ons](https://addons.mozilla.org/en-US/firefox/addon/elven-assist/).

### Safari (macOS)
Install from the [Mac App Store](https://apps.apple.com/us/app/elvenassist/id6470343360).

### Manual Installation (From Release)
1. Download the latest release `.zip` from this repository and unpack it.
2. **Chrome:** Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the unpacked folder.
3. **Firefox:** Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-On...", and select the release zip file (no need to unpack).

## Usage

1. Open Elvenar in your browser.
2. **Refresh the game tab** once to allow the extension to capture the initial city data.
3. Click the **ElvenAssist icon** in your browser toolbar to open the dashboard.
4. Navigate between the City Planner, Inventory, and FA tabs to manage your empire.

*Note: Changes made in the editor are for planning purposes only and do not affect your actual Elvenar city.*

## Release Process

To release a new version (e.g., `5.8.6`):

1.  **Code Freeze:**
    Ensure all changes are committed to `master` and tests pass.

2.  **Bump Version:**
    Update version numbers in `package.json`, manifests, and TypeScript files.
    ```bash
    npm run bump 5.8.6
    ```

3.  **Commit the Bump:**
    ```bash
    git add .
    git commit -m "chore: release v5.8.6"
    git push origin master
    ```

4.  **Tag the Release:**
    Create and push the git tag.
    ```bash
    git tag v5.8.6
    git push origin v5.8.6
    ```

5.  **Build & Pack:**
    Generate the distribution zip files for both browsers.
    * *Chrome:* Creates `./store-dist/elven-assist-v5.8.6.zip`
    * *Firefox:* Creates `./store-dist-firefox/FIREFOX-v5.8.6.zip`
    ```bash
    npm run pack
    npm run pack:firefox
    ```

6.  **Deploy to Stores:**
    Uploads the artifacts to Chrome Web Store and Firefox Add-ons (AMO).
    ```bash
    npm run deploy:chrome 5.8.6
    npm run deploy:firefox 5.8.6
    ```

7.  **Create GitHub Release:**
    Generates release notes and uploads both zip artifacts to the existing GitHub tag.
    ```bash
    npm run create-release 5.8.6
    ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your suggestions or improvements.

## License

This project is licensed under the MIT License.

---

**Author:** Aviad Pineles

**Disclaimer**
**ElvenAssist is an unofficial fan-made project.**
Elvenar is a registered trademark of InnoGames GmbH. This project is not affiliated with, endorsed by, or supported by InnoGames GmbH.
