#!/usr/bin/env node
/**
 * Rebuild rev-eng/index/{classes,enums}.tsv from a compiled (unminified) Elvenar snapshot.
 *
 *   node rev-eng/tools/build-index.js tmp/elvenar-release-full-reveng.js
 *
 * classes.tsv: <fully.qualified.Name>\t<line of `$hxClasses["..."] = X;`>\t<compiled JS identifier>
 * enums.tsv:   <fully.qualified.Name>\t<line of `var X = $hxEnums["..."] = {`>\t<compiled JS identifier>
 *
 * The line numbers are only meaningful for the exact snapshot they were built from — every doc
 * in rev-eng/ cites lines against tmp/elvenar-release-full-reveng.js (Feb 12 2026). Rebuild
 * against a newer snapshot and re-grep by fully-qualified name to re-anchor.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || 'tmp/elvenar-release-full-reveng.js';
const outDir = path.join(__dirname, '..', 'index');
const lines = fs.readFileSync(src, 'utf8').split('\n');

const classes = [];
const enums = [];
const classRe = /^\$hxClasses\["([^"]+)"\] = ([^;]+);/;
const enumRe = /^var ([A-Za-z0-9_$]+) = \$hxEnums\["([^"]+)"\]/;
lines.forEach((line, i) => {
  let m = classRe.exec(line);
  if (m) classes.push(`${m[1]}\t${i + 1}\t${m[2]}`);
  m = enumRe.exec(line);
  if (m) enums.push(`${m[2]}\t${i + 1}\t${m[1]}`);
});
fs.writeFileSync(path.join(outDir, 'classes.tsv'), classes.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'enums.tsv'), enums.join('\n') + '\n');
console.log(`${classes.length} classes, ${enums.length} enums from ${src} (${lines.length} lines)`);
