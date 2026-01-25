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
// We read the Windows batch file and parse "set KEY=VALUE" lines manually
const envPath = path.join(__dirname, '../secrets/env.bat');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: env.bat not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const secrets = {};

envContent.split(/\r?\n/).forEach((line) => {
  // Regex to match "set VARIABLE_NAME=value"
  const match = line.match(/^\s*set\s+([A-Z_0-9]+)=(.*)$/i);
  if (match) {
    secrets[match[1]] = match[2].trim();
  }
});

const requiredKeys = ['CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'];
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
  // We use npx to invoke the CLI, passing the secrets we just read
  const command =
    `npx chrome-webstore-upload-cli upload ` +
    `--source "${zipFile}" ` +
    `--extension-id "${secrets.CHROME_EXTENSION_ID}" ` +
    `--client-id "${secrets.CHROME_CLIENT_ID}" ` +
    `--client-secret "${secrets.CHROME_CLIENT_SECRET}" ` +
    `--refresh-token "${secrets.CHROME_REFRESH_TOKEN}" ` +
    `--auto-publish`;

  execSync(command, { stdio: 'inherit' });
  console.log(`\n✅ [SUCCESS] Version ${version} uploaded and published!`);
} catch (error) {
  console.error('\n❌ [FAIL] Upload failed.');
  process.exit(1);
}
