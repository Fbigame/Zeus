// 测试路径解析的简单脚本
const path = require('path');

// 模拟 getDataPath 函数
function getDataPath() {
  return path.join(__dirname, 'out', 'heathstone-client-tool-win32-x64', 'resources', 'data');
}

// 模拟前端传入的路径
const filePath = 'data/33.4.2.228373/CARD.json';
const dataPath = getDataPath();

// 模拟主进程的路径处理逻辑
let actualPath = filePath;
if (filePath.startsWith('./data/') || filePath.startsWith('data/')) {
  const relativePath = filePath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
  actualPath = path.join(dataPath, relativePath);
}

console.log('测试路径解析:');
console.log('原始路径:', filePath);
console.log('data目录:', dataPath);
console.log('最终路径:', actualPath);
console.log('文件是否存在:', require('fs').existsSync(actualPath));