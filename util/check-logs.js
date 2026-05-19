const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Your regex, enhanced to include double quotes (") alongside single quotes and backticks
const FORBIDDEN_LOG_REGEX = /(?<!\/\/ )console\.(log|warn|error)\([\s\n]*['"`](?!E)/g;

let hasErrors = false;

function getFilesToCheck() {
  try {
    // Run git ls-files and filter in JS (cross-platform equivalent to | grep -E "\.tsx?$")
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output
      .split('\n')
      .map((file) => file.trim())
      .filter((file) => /\.tsx?$/.test(file));
  } catch (error) {
    console.error('❌ Error executing git ls-files:', error.message);
    process.exit(1);
  }
}

function checkFile(filePath) {
  // git ls-files returns paths relative to the repo root
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  let match;

  // exec() loops through all matches in the file because of the 'g' flag
  while ((match = FORBIDDEN_LOG_REGEX.exec(content)) !== null) {
    hasErrors = true;

    // Calculate the line number by counting the newlines before the match
    const linesUpToMatch = content.slice(0, match.index).split('\n');
    const lineNumber = linesUpToMatch.length;

    // Grab the actual line text for the console output
    const allLines = content.split('\n');
    const lineText = allLines[lineNumber - 1].trim();

    // filePath is already cleanly formatted by git ls-files (e.g., "src/file.ts")
    console.error(`❌ Invalid log found in ${filePath}:${lineNumber}`);
    console.error(`   ${lineText}\n`);
  }
}

console.log('🔍 Scanning tracked TypeScript files for invalid console logs...');
const files = getFilesToCheck();
files.forEach(checkFile);

if (hasErrors) {
  console.error('💥 Check failed: Please remove the invalid console logs listed above before committing.');
  process.exit(1); // Exits with an error code so CI/CD or pre-commit hooks will fail
} else {
  console.log('✅ All clean! No invalid console logs found.');
  process.exit(0);
}
