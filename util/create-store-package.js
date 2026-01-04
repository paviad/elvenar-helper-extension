const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const process = require('process');
const simpleGit = require('simple-git');

async function createZipFile(filesToZip, outputZipName) {
  const zip = new JSZip();

  for (const filePath of filesToZip) {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    zip.file(fileName, fileContent, { compression: "DEFLATE", compressionOptions: { level: 9 } });
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(`${outputZipName}.zip`, content);
  console.log(`Zip file created: ${outputZipName}.zip`);
}

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageVersion = packageJson.version;

// Example usage:
// createZipFile(["./file1.txt", "./file2.jpg"], "my_archive");

function getAllFilesInDirectory(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFilesInDirectory(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

const isFirefox = process.argv[2] === 'firefox';
const distDir = isFirefox ? './dist-firefox' : './dist';
const storeDistDir = isFirefox ? './store-dist-firefox' : './store-dist';

const files = getAllFilesInDirectory(distDir).filter((r) => !r.endsWith('.zip'));

createZipFile(files, `${storeDistDir}/elvenar-helper-extension-v${packageVersion}${isFirefox ? '-firefox' : ''}`);
const git = simpleGit();

async function createSourceZip() {
  // Get all tracked and unignored files
  const files = await git.raw(['ls-files']);
  const fileList = files.split('\n').filter(Boolean);

  const zip = new JSZip();
  for (const filePath of fileList) {
    const fileContent = fs.readFileSync(filePath);
    zip.file(filePath, fileContent, { compression: "DEFLATE", compressionOptions: { level: 9 } }); // preserve directory structure and compress
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(`${storeDistDir}/source.zip`, content);
  console.log(`Source zip created: ${storeDistDir}/source.zip`);
}

if (isFirefox) {
  createSourceZip();
}
