---
name: rehydrate
description: Rehydrate a minified Elvenar client bundle (tmp/elvenar-release-min-<hash>.js) into readable source under tmp/rehydrated/ and report what changed since the previous build. Use when the user drops a new game client build into tmp/, says "rehydrate", or wants to read or compare a newer client than the Feb 12 full build. kphunt worktree only.
argument-hint: "[tmp/elvenar-release-min-<hash>.js] [release|beta|<label>]"
---

# Rehydrate a client build

`rev-eng/tools/rehydrate.js` renames a minified bundle back to the identifiers the Feb 12 full build
uses (classes, enums, most top-level helpers) and undoes Closure's syntax compressions. Local
variables stay `a`, `b`, `f`. Background and output format: `rev-eng/README.md`, section
"Reading a newer client (rehydrate)".

Never download a bundle yourself (never open the game site). The user puts the files in `tmp/`.

## 1. Pick the input

- If the user named a file, use it.
- Otherwise find the minified bundles in `tmp/` that have no folder in `tmp/rehydrated/` yet. Each
  folder's `info.json` has a `source` field naming the file it came from:

  ```bash
  ls tmp/elvenar-release-min-*.js
  grep -h '"source"' tmp/rehydrated/*/info.json
  ```

  Skip `elvenar-release-min.js`, `-min-unmin.js` and `-min-jul-2026.js`: old local copies,
  not CDN builds.
- Label: `release` or `beta` if the user said which; ask if there are two new files and it is not
  clear which is which. One unexplained file can go without a label.

## 2. Run it (from the repo root)

```bash
node rev-eng/tools/rehydrate.js tmp/elvenar-release-min-<hash>.js --label release
```

About 45 s and about 9 GB of memory per build; run builds one after another, not in parallel. It needs
`tmp/elvenar-release-full.js` as the reference (not `-reveng`, which does not parse). If that file
is missing, stop and tell the user.

Output: `tmp/rehydrated/<download date>-<hash8>[-<label>]/` with `source.min.js`, `rehydrated.js`,
`names.json`, `index/classes.tsv` + `enums.tsv`, `info.json`. Re-running the same file overwrites
its folder, nothing else.

## 3. Check it

```bash
node --check tmp/rehydrated/<folder>/rehydrated.js && cat tmp/rehydrated/<folder>/info.json
```

Compare `info.json` with the earlier folders. Roughly 12,500+ types and about 85% of the helpers
resolved is normal. A big drop in resolved helpers or a parse failure means the minifier changed;
say so instead of reporting the numbers as fine.

## 4. Report what changed

Compare against the previous build of the same channel (otherwise the newest earlier folder):

```bash
node -e "
const fs = require('fs');
const load = (d) => new Set(fs.readFileSync('tmp/rehydrated/' + d + '/index/classes.tsv', 'utf8').split(/\r?\n/).map((l) => l.split('\t')[0]).filter(Boolean));
const [a, b] = [load(process.argv[1]), load(process.argv[2])];
console.log('added:\n' + [...b].filter((x) => !a.has(x)).sort().join('\n'));
console.log('removed:\n' + [...a].filter((x) => !b.has(x)).sort().join('\n'));
" <older folder> <new folder>
```

Tell the user: the folder, the `info.json` counts, and the added/removed classes grouped by
package (a renamed package shows up as removed + added; call those renames). Mention how many
names are guessed (`info.json` `guessed`; marked `/* rehydrate: guessed name */` in the source).

Rehydrated line numbers belong to that file only. rev-eng docs keep citing the Feb snapshot, so
cite fully-qualified names when writing findings from a rehydrated build.
