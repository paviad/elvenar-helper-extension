// Empties the build directory before a build.
//
// Not webpack's own output.clean: the two compilers in webpack.config.js write to the same
// directory, and each one's cleaner treats the other's files as stale, so they delete each
// other's output. Doing it once, up front, is both safe and thorough.
//
// It matters because create-store-package.js zips whatever it finds in the directory. Without
// this, bundles from previous builds linger and are shipped alongside the current ones - and a
// manifest still naming an old file loads it happily, so nothing looks wrong until the code that
// moved actually matters.

const fs = require('fs');
const path = require('path');
const process = require('process');

const isFirefox = process.argv.includes('firefox') || process.argv.includes('--firefox');
const distDir = path.join(__dirname, isFirefox ? '../dist-firefox' : '../dist');

if (fs.existsSync(distDir)) {
  for (const entry of fs.readdirSync(distDir)) {
    fs.rmSync(path.join(distDir, entry), { recursive: true, force: true });
  }
  console.log(`🧹 Emptied ${path.relative(path.join(__dirname, '..'), distDir)}`);
} else {
  fs.mkdirSync(distDir, { recursive: true });
}
