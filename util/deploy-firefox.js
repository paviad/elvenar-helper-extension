const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // Requires: npm install --save-dev adm-zip

// 1. Check for Version Argument
const version = process.argv[2];
if (!version) {
  console.error('❌ Error: Missing version number.');
  console.error('Usage: npm run deploy:firefox <version>');
  process.exit(1);
}

// 2. Load Secrets from env.bat
const envPath = path.join(__dirname, '../secrets/ffenv.bat');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: ffenv.bat not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const secrets = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*set\s+([A-Z_0-9]+)=(.*)$/i);
  if (match) secrets[match[1]] = match[2].trim();
});

const requiredKeys = ['MOZ_API_KEY', 'MOZ_API_SECRET'];
const missingKeys = requiredKeys.filter((key) => !secrets[key]);
if (missingKeys.length > 0) {
  console.error('❌ Error: Missing keys in env.bat:', missingKeys.join(', '));
  process.exit(1);
}

// 3. Define Paths
const distZipFile = path.join(__dirname, `../store-dist-firefox/FIREFOX-v${version}.zip`);
const sourceZipFile = path.join(__dirname, `../store-dist-firefox/SOURCE-v${version}.zip`);
const tempSignDir = path.join(__dirname, '../temp_firefox_sign');

if (!fs.existsSync(distZipFile)) {
  console.error('❌ Error: Firefox release artifact not found:', distZipFile);
  console.error('Please run "npm run pack:firefox" first.');
  process.exit(1);
}

console.log('\n==========================================');
console.log('    Deploying to Firefox Add-on Store');
console.log('==========================================');
console.log(`Version: ${version}`);

// 4. Prepare Directories
if (fs.existsSync(tempSignDir)) {
  fs.rmSync(tempSignDir, { recursive: true, force: true });
}
fs.mkdirSync(tempSignDir);

console.log(`📦 Extracting artifact for signing...`);
try {
  // Use adm-zip for cross-platform extraction
  const zip = new AdmZip(distZipFile);
  zip.extractAllTo(tempSignDir, true);
} catch (e) {
  console.error('❌ Error extracting zip file. Is it corrupted?');
  console.error(e.message);
  process.exit(1);
}

// 5. Generate Source Code Zip
console.log(`📦 Creating Source Code Archive...`);
try {
  execSync(`git archive --format=zip --output "${sourceZipFile}" HEAD`);
  console.log(`   Source Zip created: ${path.basename(sourceZipFile)}`);
} catch (error) {
  console.error('❌ Error creating source zip. Do you have git installed?');
  process.exit(1);
}

// 6. Execute Upload
console.log(`🚀 Uploading Extension & Source Code...`);
try {
  const command =
    `npx web-ext sign ` +
    `--source-dir "${tempSignDir}" ` +
    `--upload-source-code "${sourceZipFile}" ` +
    `--channel "listed" ` +
    `--api-key "${secrets.MOZ_API_KEY}" ` +
    `--api-secret "${secrets.MOZ_API_SECRET}" ` +
    `--artifacts-dir "./build/firefox_artifacts"`;

  execSync(command, { stdio: 'inherit' });
  console.log(`\n✅ [SUCCESS] Firefox Version ${version} submitted for review!`);

  // Cleanup
  fs.rmSync(tempSignDir, { recursive: true, force: true });
} catch (error) {
  console.error('\n❌ [FAIL] Firefox upload failed.');
  process.exit(1);
}
