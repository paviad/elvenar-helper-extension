const fs = require('fs');
const path = require('path');

// 1. Parse Command Line Arguments
const args = process.argv.slice(2);
const browser = args.find((a) => ['chrome', 'firefox', 'safari'].includes(a.toLowerCase()));
const isProd = args.includes('--prod') || args.includes('--production');

if (!browser) {
  console.error('❌ Error: Please specify a target browser (chrome, firefox, or safari).');
  console.error('Usage: node util/build-manifest.js <browser> [--prod]');
  process.exit(1);
}

// 2. Define Paths
// Adjust the '../' depending on where this script lives relative to root
const sourcePath = path.join(__dirname, `../manifest/manifest-${browser}.jsonc`);
const outDir = path.join(__dirname, '../assets');
const outPath = path.join(outDir, 'manifest.json');

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Error: Source manifest not found at ${sourcePath}`);
  process.exit(1);
}

console.log(`⚙️ Building manifest for ${browser.toUpperCase()} (Production: ${isProd})...`);

// 3. Read Source File
let content = fs.readFileSync(sourcePath, 'utf8');

// 4. Remove // debug lines if in production
if (isProd) {
  const lines = content.split('\n');
  content = lines.filter((line) => !line.match(/\/\/\s*debug/i)).join('\n');
}

// 5. Safely remove all remaining comments
// This regex matches strings FIRST, and comments SECOND.
// If it matches a string (like "https://..."), it keeps it. If it matches a comment, it removes it.
content = content.replace(/("(?:[^"\\]|\\.)*")|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, (match, stringLiteral, comment) => {
  if (comment) return ''; // Erase the comment
  return match; // Keep the string literal
});

// 6. Fix trailing commas
// Removing a line like `"tabs", // debug` might leave a trailing comma before a closing bracket `]`.
// This regex finds commas followed only by whitespace and a closing bracket/brace and removes the comma.
content = content.replace(/,\s*([}\]])/g, '$1');

try {
  // 7. Validate and Format JSON
  const parsedJson = JSON.parse(content);
  const finalJson = JSON.stringify(parsedJson, null, 2);

  // 8. Write to destination
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outPath, finalJson, 'utf8');

  console.log(`✅ Success! Valid manifest.json created at /assets/manifest.json`);
} catch (error) {
  console.error('\n❌ Error: The resulting manifest is not valid JSON.');
  console.error("This usually happens if your source file has a syntax error that wasn't a comment.");
  console.error(`Details: ${error.message}`);
  process.exit(1);
}
