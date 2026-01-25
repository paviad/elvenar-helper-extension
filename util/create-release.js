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

console.log(`🚀 Creating GitHub Release for ${tag}...`);
console.log(`📦 Attaching assets:`);
console.log(`   Chrome:  ${path.basename(chromeAsset)}`);
console.log(`   Firefox: ${path.basename(firefoxAsset)}`);

try {
  // 4. Run the GitHub CLI command
  // --generate-notes: Automatically adds the changelog from Pull Requests
  // --title: Sets the release title
  const command = `gh release create "${tag}" "${chromeAsset}" "${firefoxAsset}" --title "${tag}" --generate-notes`;

  // inherit: prints the command output directly to console
  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ Release created successfully!');
} catch (error) {
  console.error('\n❌ Release creation failed.');
  // The 'gh' command usually prints its own error message, so we just exit.
  process.exit(1);
}
