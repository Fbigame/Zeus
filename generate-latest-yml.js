const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 在构建后生成 latest.yml 文件
async function generateLatestYml() {
  const outDir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');
  const packageJson = require('./package.json');
  const version = packageJson.version;
  
  // 查找 .nupkg 文件
  const files = fs.readdirSync(outDir);
  const nupkgFile = files.find(f => f.endsWith('-full.nupkg'));
  
  if (!nupkgFile) {
    console.error('未找到 .nupkg 文件');
    return;
  }
  
  const nupkgPath = path.join(outDir, nupkgFile);
  const fileBuffer = fs.readFileSync(nupkgPath);
  const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');
  const size = fs.statSync(nupkgPath).size;
  
  const latestYml = `version: ${version}
files:
  - url: ${nupkgFile}
    sha512: ${sha512}
    size: ${size}
path: ${nupkgFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;
  
  const ymlPath = path.join(outDir, 'latest.yml');
  fs.writeFileSync(ymlPath, latestYml, 'utf8');
  
  console.log('✓ 已生成 latest.yml');
  console.log('  路径:', ymlPath);
  console.log('  版本:', version);
  console.log('  文件:', nupkgFile);
}

generateLatestYml().catch(console.error);
