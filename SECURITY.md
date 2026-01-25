# Security Policy

Thank you for your interest in the security of ElvenAssist. We value the trust of the Elvenar community and are committed to transparency regarding how this extension interacts with your game data.

## Supported Versions

Only the latest version of the extension is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 5.0   | :x:                |

## Infrastructure & Supply Chain

To address common concerns regarding open-source browser extensions, we maintain strict standards for our build and deployment pipeline:

* **Automated Builds:** Releases for Chrome and Firefox are generated using automated scripts to minimize human error and ensure the code in the repository matches the code in the store.
* **Dependency Transparency:** All third-party libraries used in this project are publicly listed in our `package.json`. We do not use obfuscated or hidden dependencies.
* **Developer Hygiene:** The maintainer utilizes Two-Factor Authentication (2FA) on all critical infrastructure accounts, including GitHub (source code), Google (Chrome Web Store), and Mozilla (Firefox Add-ons).
* **Vulnerability Scanning:** The repository utilizes GitHub Dependabot to automatically scan for known vulnerabilities in dependencies and generate immediate patch requests.

## Data Privacy & Integrity

ElvenAssist is designed primarily as an **overlay** tool.

* **Read-Only Philosophy:** The vast majority of the extension's features operate in a read-only capacity, analyzing game data to provide statistics without modifying the game state.
* **Server Interactions:** The extension does not send commands to "play the game" for you (e.g., it does not collect resources, move buildings, or fight battles automatically).
* **No External Tracking:** Your game data stays in your browser. This extension does not send your city layout, resources, or chat logs to any external third-party analytics servers.

## Reporting a Vulnerability

If you discover a security vulnerability or have a concern about the extension's behavior:

1.  Please do **not** open a public GitHub issue immediately.
2.  Email the maintainer directly at paviad2@gmail.com or open a "Draft" Security Advisory on GitHub.
3.  We will aim to acknowledge your report within 48 hours and provide a timeline for a fix.

## Verification

For users who wish to verify the code running in their browser against the source code:

1.  Download the source code from the [Releases](https://github.com/paviad/elvenar-helper-extension/releases) page.
2.  Inspect the `manifest.json` permissions to verify the scope of access.
3.  You may build the extension manually using the instructions in `readme.md` if you prefer not to use the pre-packaged store versions.
