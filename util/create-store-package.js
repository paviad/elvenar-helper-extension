const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");
const process = require("process");

async function createZipFile(filesToZip, outputZipName) {
  const zip = new JSZip();

  for (const filePath of filesToZip) {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    zip.file(fileName, fileContent);
  }

  const content = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(`${outputZipName}.zip`, content);
  console.log(`Zip file created: ${outputZipName}.zip`);
}

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

const isFirefox = process.argv[2] === "firefox";
const distDir = isFirefox ? "./dist-firefox" : "./dist";
const storeDistDir = isFirefox ? "./store-dist-firefox" : "./store-dist";

const files = getAllFilesInDirectory(distDir).filter(
  (r) => !r.endsWith(".zip")
);

createZipFile(files, `${storeDistDir}/elvenar-helper`);
