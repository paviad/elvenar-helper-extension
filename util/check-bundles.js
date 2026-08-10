// Two checks over a finished build, both about the bundles quietly changing underneath the
// things that name them.
//
//   1. The manifest lists the script files each content script loads, by hand. Webpack decides
//      which files an entry actually needs. Nothing connected the two, so a manifest could name
//      a file the build no longer produces and the only symptom was the extension misbehaving.
//
//   2. Which of our modules end up shared between entries. A module arriving in a shared chunk
//      means something is now reached from two entries that was not before - sometimes intended,
//      sometimes an import that crossed a boundary it should not have. Either way it is worth
//      seeing, so the list is committed and compared. Run with --update to accept the new one.
//      A shared chunk appearing where there was none is the same signal, and shows up as new.
//
// Order within a `js` array is deliberately not checked: the entry chunk carries webpack's
// runtime and drains whatever the split chunks pushed before it, so either order works.

const fs = require('fs');
const path = require('path');
const process = require('process');

const root = path.join(__dirname, '..');
const isFirefox = process.argv.includes('firefox') || process.argv.includes('--firefox');
const shouldUpdate = process.argv.includes('--update');

const distDir = path.join(root, isFirefox ? 'dist-firefox' : 'dist');
// One per compiler in webpack.config.js; together they name every entry the build produces.
const entryFilesPaths = [
  path.join(distDir, 'prod.manifest.json'),
  path.join(distDir, 'prod.manifest.service-worker.json'),
];
const chunkModulesPath = path.join(distDir, 'chunk-modules.json');
const manifestPath = path.join(root, 'assets/manifest.json');
const baselinePath = path.join(__dirname, 'shared-chunks.json');

/** Chunks holding our own code that more than one entry reaches; see webpack.config.js. */
const SHARED_CHUNK_PREFIX = 'elvenassist-shared-';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const missing = [...entryFilesPaths, chunkModulesPath, manifestPath].filter((f) => !fs.existsSync(f));
if (missing.length > 0) {
  console.error('❌ Nothing to check - build first (npm run webpack).');
  for (const file of missing) {
    console.error(`   missing ${path.relative(root, file)}`);
  }
  process.exit(1);
}

let failed = false;
let warned = false;

// ---- 1. the manifest names every file the build says an entry needs ----

const entryFiles = Object.assign({}, ...entryFilesPaths.map(readJson));
const manifest = readJson(manifestPath);

/** The webpack entry a script list belongs to, recognised by its own bundle being in it. */
const entryFor = (files) => Object.keys(entryFiles).find((entry) => files.includes(`${entry}.bundle.js`));

/** The extension's own pages name their bundles in script tags, with the same room for drift. */
const htmlScriptLists = fs
  .readdirSync(path.join(root, 'assets'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => {
    const html = fs.readFileSync(path.join(root, 'assets', file), 'utf8');
    return {
      where: `assets/${file}`,
      files: [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    };
  });

const scriptLists = [
  ...(manifest.content_scripts || []).map((cs, i) => ({ where: `content_scripts[${i}].js`, files: cs.js || [] })),
  ...(manifest.background?.service_worker
    ? [{ where: 'background.service_worker', files: [manifest.background.service_worker] }]
    : []),
  ...htmlScriptLists,
];

console.log('🔍 Checking the manifest against what the build produced...');

for (const { where, files } of scriptLists) {
  const entry = entryFor(files);
  if (!entry) {
    console.error(`❌ ${where} names no entry bundle this build produced: ${files.join(', ')}`);
    failed = true;
    continue;
  }

  const needed = entryFiles[entry];
  const absent = needed.filter((file) => !files.includes(file));
  const extra = files.filter((file) => file.endsWith('.bundle.js') && !needed.includes(file));

  if (absent.length > 0) {
    console.error(`❌ ${where} (${entry}) is missing: ${absent.join(', ')}`);
    failed = true;
  }
  if (extra.length > 0) {
    console.warn(`⚠️  ${where} (${entry}) loads bundles it does not need: ${extra.join(', ')}`);
    warned = true;
  }
}

// ---- 2. the shared module list is the one we last agreed to ----

const allChunkModules = readJson(chunkModulesPath);
const sharedNow = Object.fromEntries(
  Object.entries(allChunkModules)
    .filter(([name]) => name.startsWith(SHARED_CHUNK_PREFIX))
    .sort(([a], [b]) => a.localeCompare(b)),
);

if (shouldUpdate) {
  // CRLF to match .prettierrc, so rewriting the baseline does not show up as every line changing.
  const json = (JSON.stringify(sharedNow, null, 2) + '\n').replace(/\n/g, '\r\n');
  fs.writeFileSync(baselinePath, json, 'utf8');
  const total = Object.values(sharedNow).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `✅ Recorded ${total} shared module(s) across ${Object.keys(sharedNow).length} chunk(s) in ` +
      path.relative(root, baselinePath),
  );
} else {
  const baseline = fs.existsSync(baselinePath) ? readJson(baselinePath) : {};
  const chunkNames = [...new Set([...Object.keys(baseline), ...Object.keys(sharedNow)])].sort();
  const drifted = [];

  for (const chunk of chunkNames) {
    const before = baseline[chunk] ?? [];
    const after = sharedNow[chunk] ?? [];
    const added = after.filter((m) => !before.includes(m));
    const removed = before.filter((m) => !after.includes(m));
    if (added.length > 0 || removed.length > 0) {
      drifted.push({ chunk, added, removed, isNew: !(chunk in baseline) });
    }
  }

  if (drifted.length > 0) {
    console.error('\n❌ Code shared between entries has changed.');
    console.error('   Each chunk below is named for the entries that reach it. Check that every');
    console.error('   module is meant to be shared, rather than an import reaching across a');
    console.error('   boundary it should not - overlay code pulled into the tab, say.');
    for (const { chunk, added, removed, isNew } of drifted) {
      console.error(`\n   ${chunk}${isNew ? '  (new chunk)' : ''}`);
      for (const m of added) {
        console.error(`   + ${m}`);
      }
      for (const m of removed) {
        console.error(`   - ${m}`);
      }
    }
    console.error('\n   If this is intended: npm run check-bundles -- --update');
    failed = true;
  }
}

if (failed) {
  console.error('\n💥 Check failed.');
  process.exit(1);
}

console.log(warned ? '✅ Bundles line up (with warnings above).' : '✅ Bundles line up.');
