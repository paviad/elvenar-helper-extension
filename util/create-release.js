const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Get version from command line
const version = process.argv[2];

if (!version) {
  console.error('❌ Error: Please provide a version number.');
  console.error('Usage: node util/create-release.js <version>');
  process.exit(1);
}

const tag = `v${version}`;

// Verify Git Tag Exists
try {
  // git rev-parse exits with a non-zero status if the tag is missing
  execSync(`git rev-parse -q --verify "refs/tags/${tag}"`, { stdio: 'ignore' });
} catch (error) {
  console.error(`❌ Error: Git tag '${tag}' does not exist locally.`);
  console.error(`Please create and push the tag first:`);
  console.error(`  git tag ${tag}`);
  console.error(`  git push origin ${tag}`);
  process.exit(1);
}

// 2. Define File Paths (Based on your requirements)
const chromeAsset = path.join(__dirname, `../store-dist/elven-assist-v${version}.zip`);
const firefoxAsset = path.join(__dirname, `../store-dist-firefox/FIREFOX-v${version}.zip`);

// 3. Verify Files Exist
const assets = [chromeAsset, firefoxAsset];
const missingFiles = assets.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Error: The following release assets are missing:');
  missingFiles.forEach((f) => console.error(`   - ${f}`));
  console.error('Did you run the build scripts for both browsers?');
  process.exit(1);
}

console.log(`🚀 Creating DRAFT GitHub Release for ${tag}...`);
console.log(`📦 Attaching assets:`);
console.log(`   Chrome:  ${path.basename(chromeAsset)}`);
console.log(`   Firefox: ${path.basename(firefoxAsset)}`);

try {
  // 4. Run the GitHub CLI command
  // --generate-notes: Automatically adds the changelog from Pull Requests
  // --title: Sets the release title
  // --draft: Creates the release as a draft so webhooks do not fire yet
  const command = `gh release create "${tag}" "${chromeAsset}" "${firefoxAsset}" --title "${tag}" --generate-notes --draft`;

  // inherit: prints the command output directly to console
  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ Draft release created successfully!');
  console.log('⚠️  Remember to go to GitHub and click "Publish release" once the stores approve it!');
} catch (error) {
  console.error('\n❌ Release creation failed.');
  // The 'gh' command usually prints its own error message, so we just exit.
  process.exit(1);
}
