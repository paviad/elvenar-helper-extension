// scripts/check-branch.js
const { execSync } = require('child_process');

const REQUIRED_BRANCH = 'master'; // Change to 'main' if needed

try {
  // Run git command to get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  if (branch !== REQUIRED_BRANCH) {
    console.error(`\n🛑 DEPLOYMENT BLOCKED: You are on branch "${branch}".`);
    console.error(`   You must be on "${REQUIRED_BRANCH}" to build/deploy.\n`);
    process.exit(1); // Exit with error code to stop the process
  }

  console.log(`✅ Branch check passed: ${branch}`);
} catch (error) {
  console.error('\n⚠️ Error: Could not determine git branch. Are you in a git repo?\n');
  process.exit(1);
}
