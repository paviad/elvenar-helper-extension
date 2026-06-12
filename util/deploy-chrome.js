const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Check for Version Argument
const version = process.argv[2];
if (!version) {
  console.error('❌ Error: Missing version number.');
  console.error('Usage: npm run deploy:chrome <version>');
  console.error('Example: npm run deploy:chrome 5.7.2');
  process.exit(1);
}

// 2. Load Secrets from env.bat
const envPath = path.join(__dirname, '../secrets/env.bat');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: env.bat not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const secrets = {};

envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*set\s+([A-Z_0-9]+)=(.*)$/i);
  if (match) {
    let value = match[2].trim();
    // Strip surrounding double or single quotes if they exist
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    secrets[match[1]] = value;
  }
});

// Added CHROME_PUBLISHER_ID to the required keys
const requiredKeys = [
  'CHROME_EXTENSION_ID',
  'CHROME_PUBLISHER_ID',
  'CHROME_CLIENT_ID',
  'CHROME_CLIENT_SECRET',
  'CHROME_REFRESH_TOKEN',
];
const missingKeys = requiredKeys.filter((key) => !secrets[key]);

if (missingKeys.length > 0) {
  console.error('❌ Error: Missing keys in env.bat:', missingKeys.join(', '));
  process.exit(1);
}

// 3. Construct File Path
const zipFile = path.join(__dirname, `../store-dist/elven-assist-v${version}.zip`);

if (!fs.existsSync(zipFile)) {
  console.error('❌ Error: Zip file not found:', zipFile);
  console.error('Please check the version number or run "npm run pack" first.');
  process.exit(1);
}

console.log('\n==========================================');
console.log('    Deploying to Chrome Web Store...');
console.log('==========================================');
console.log(`Version: ${version}`);
console.log(`File:    ${path.basename(zipFile)}`);
console.log(`Target:  ${secrets.CHROME_EXTENSION_ID}\n`);

// 4. Execute Upload
try {
const command =
    `npx chrome-webstore-upload-cli ` +
    `--source "${zipFile}" ` +
    `--extension-id "${secrets.CHROME_EXTENSION_ID}"`;
  // Pass secrets and Publisher ID via environment variables
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env, // Preserve existing environment variables (like PATH for npx)
      PUBLISHER_ID: secrets.CHROME_PUBLISHER_ID, // Newly required by v4
      CLIENT_ID: secrets.CHROME_CLIENT_ID,
      CLIENT_SECRET: secrets.CHROME_CLIENT_SECRET,
      REFRESH_TOKEN: secrets.CHROME_REFRESH_TOKEN,
    },
  });

  console.log(`\n✅ [SUCCESS] Version ${version} uploaded and published!`);
} catch (error) {
  console.error('\n❌ [FAIL] Upload failed.');
  process.exit(1);
}
