const fs = require('fs');
const path = require('path');

// 1. Get version from command line
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Error: Please provide a version number.');
  console.error('Usage: npm run bump <version>');
  process.exit(1);
}

// Define the paths to your files
const files = {
  package: path.join(__dirname, '../package.json'),
  manifests: [
    path.join(__dirname, '../manifest/manifest-chrome.jsonc'),
    path.join(__dirname, '../manifest/manifest-firefox.jsonc'),
    path.join(__dirname, '../manifest/manifest-safari.jsonc'),
  ],
  tsFile: path.join(__dirname, '../src/layout/extensionAboutInfo.ts'),
};

// Helper to format date as "25-Jan-2026"
const getFormattedDate = () => {
  const date = new Date();
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${day}-${month}-${year}`;
};

const newDate = getFormattedDate();

console.log(`🚀 Bumping version to: ${newVersion} (Date: ${newDate})`);

// 2. Update package.json (Standard JSON, safe to parse)
if (fs.existsSync(files.package)) {
  const content = JSON.parse(fs.readFileSync(files.package, 'utf8'));
  content.version = newVersion;
  fs.writeFileSync(files.package, JSON.stringify(content, null, 2) + '\n');
  console.log(`✅ Updated ${path.basename(files.package)}`);
} else {
  console.warn(`⚠️ Warning: File not found: ${files.package}`);
}

// 3. Update Manifests (Has comments, use Regex to preserve them)
files.manifests.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // This regex looks for "version": "something" and updates the value.
    // It only replaces the first instance it finds, keeping everything else intact.
    content = content.replace(/("version"\s*:\s*)"[^"]+"/, `$1"${newVersion}"`);

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${path.basename(filePath)}`);
  } else {
    console.warn(`⚠️ Warning: File not found: ${filePath}`);
  }
});

// 4. Update TypeScript File (src/layout/extensionAboutInfo.ts)
if (fs.existsSync(files.tsFile)) {
  let tsContent = fs.readFileSync(files.tsFile, 'utf8');

  // Replace Version
  tsContent = tsContent.replace(
    /export const EXTENSION_VERSION = '.*';/,
    `export const EXTENSION_VERSION = '${newVersion}';`,
  );

  // Replace Date
  tsContent = tsContent.replace(/export const EXTENSION_DATE = '.*';/, `export const EXTENSION_DATE = '${newDate}';`);

  fs.writeFileSync(files.tsFile, tsContent);
  console.log(`✅ Updated extensionAboutInfo.ts`);
} else {
  console.error(`❌ Error: TypeScript file not found at ${files.tsFile}`);
  process.exit(1);
}

console.log('🎉 Version bump complete!');
