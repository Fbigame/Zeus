const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { autoUpdater } = require('electron-updater')
const { spawn } = require('child_process')

// 处理 Squirrel 安装/卸载/更新事件
// 这样可以正确处理 Windows 应用列表中的卸载操作
if (require('electron-squirrel-startup')) {
  app.quit();
}

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

// 配置更新日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

// 允许开发环境检查更新（用于测试）
if (!app.isPackaged) {
  Object.defineProperty(app, 'isPackaged', {
    get() {
      return true;
    }
  });
  console.log('开发环境：强制启用更新检查')
}

// 检测并配置代理
function configureProxy() {
  const https = require('https')
  const http = require('http')
  
  // 检查环境变量中的代理设置
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy
  
  console.log('代理检测:')
  console.log('  HTTP_PROXY:', httpProxy || '未设置')
  console.log('  HTTPS_PROXY:', httpsProxy || '未设置')
  
  // 如果没有设置代理，尝试从系统获取
  if (!httpProxy && !httpsProxy) {
    console.log('  未检测到代理配置，使用直连')
    // 设置请求超时
    http.globalAgent.timeout = 30000
    https.globalAgent.timeout = 30000
  }
}

// 应用启动时配置代理
configureProxy()

// 获取游戏数据目录路径（统一使用应用数据目录）
function getGameDataPath() {
  // Windows: %APPDATA%/heathstone-client-tool/Game Data
  // macOS: ~/Library/Application Support/heathstone-client-tool/Game Data
  // Linux: ~/.config/heathstone-client-tool/Game Data
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'Game Data')
}

// 获取用户数据目录路径（用于存储用户配置和备注）
function getUserDataPath() {
  // 使用 Electron 的 userData 目录
  // Windows: %APPDATA%/heathstone-client-tool
  // macOS: ~/Library/Application Support/heathstone-client-tool
  // Linux: ~/.config/heathstone-client-tool
  return app.getPath('userData')
}

// 检查游戏数据目录是否存在
async function checkGameDataDirectory() {
  const gameDataPath = getGameDataPath()
  try {
    await fs.access(gameDataPath)
    // 检查是否有版本子目录
    const entries = await fs.readdir(gameDataPath, { withFileTypes: true })
    const hasVersionDirs = entries.some(entry => entry.isDirectory() && /^\d+\.\d+\.\d+\.\d+$/.test(entry.name))
    return { exists: true, hasData: hasVersionDirs, path: gameDataPath }
  } catch (error) {
    // 目录不存在，创建它
    try {
      await fs.mkdir(gameDataPath, { recursive: true })
      return { exists: true, hasData: false, path: gameDataPath }
    } catch (createError) {
      console.error('创建游戏数据目录失败:', createError)
      return { exists: false, hasData: false, path: gameDataPath, error: createError.message }
    }
  }
}

// 禁用 GPU 相关功能来避免性能问题
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      webSecurity: true,
      sandbox: false
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
    titleBarStyle: 'default',
    show: false,
    title: 'Hearthstone Client Tool'
  })

  // 窗口准备好后最大化显示
  mainWindow.once('ready-to-show', async () => {
    mainWindow.maximize();
    mainWindow.show();
    
    // 检查游戏数据目录
    const dataCheck = await checkGameDataDirectory()
    
    if (!dataCheck.hasData) {
      // 数据目录为空，发送通知到渲染进程
      mainWindow.webContents.send('show-data-directory-guide', {
        path: dataCheck.path,
        isEmpty: true
      });
    }
    
    // 检查更新（仅在生产环境）
    if (app.isPackaged) {
      checkForUpdates();
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))

  // 创建菜单
  createMenu()
}

// 创建应用菜单
const createMenu = () => {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开游戏数据目录',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const { shell } = require('electron')
            shell.openPath(getGameDataPath())
          }
        },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => {
            checkForUpdates(true);
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Hearthstone Client Tool',
              message: 'Hearthstone Client Tool',
              detail: `炉石传说客户端数据分析工具\n版本: ${app.getVersion()}\n\n功能特性：\n• 版本对比 - 智能识别游戏数据差异\n• 数据查看器 - 浏览卡牌、成就等数据\n• 规则集分析 - 套牌规则详细解析\n• 自动更新 - 保持应用最新状态\n\n作者: Fbigame\n许可证: ISC`
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 自动更新功能
function checkForUpdates(manual = false) {
  console.log('========== 开始检查更新 ==========')
  console.log('当前版本:', app.getVersion())
  console.log('平台:', process.platform)
  console.log('更新配置:', {
    provider: 'github',
    owner: 'Fbigame',
    repo: 'Zeus',
    currentVersion: app.getVersion()
  })
  
  // 配置更新源 - 使用 GitHub Releases API，配置为使用 Squirrel.Windows 格式
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Fbigame',
    repo: 'Zeus',
    // 对于 Windows，使用 Squirrel 格式（RELEASES 文件）
    useMultipleRangeRequest: false
  });
  
  // 禁用自动下载，手动控制
  autoUpdater.autoDownload = false;

  // 检查更新错误
  autoUpdater.on('error', (error) => {
    console.error('========== 更新错误 ==========')
    console.error('错误类型:', error.name)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    console.error('================================')
    
    // 检查是否是网络错误
    let errorDetail = error.message
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      errorDetail = '无法连接到 GitHub，请检查网络连接或代理设置\n\n' + error.message
    }
    
    if (manual) {
      mainWindow.webContents.send('update-error', {
        message: '检查更新时发生错误',
        detail: errorDetail
      });
    }
  });

  // 检查更新
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...');
    console.log('请求 URL: https://api.github.com/repos/Fbigame/Zeus/releases')
    if (manual) {
      mainWindow.webContents.send('checking-for-update');
    }
  });

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('========== 发现新版本 ==========')
    console.log('新版本:', info.version)
    console.log('发布日期:', info.releaseDate)
    console.log('下载地址:', info.files)
    console.log('================================')
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    });
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('========== 已是最新版本 ==========')
    console.log('当前版本:', app.getVersion())
    console.log('最新版本:', info?.version || '未知')
    console.log('================================')
    if (manual) {
      mainWindow.webContents.send('update-not-available');
    }
  });
  
  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`下载进度: ${Math.round(progressObj.percent)}% (${(progressObj.transferred / 1024 / 1024).toFixed(2)}MB / ${(progressObj.total / 1024 / 1024).toFixed(2)}MB)`);
    mainWindow.webContents.send('download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('========== 更新下载完成 ==========')
    console.log('版本:', info.version)
    console.log('文件:', info.files)
    console.log('================================')
    mainWindow.webContents.send('update-downloaded');
  });

  // 开始检查更新
  console.log('发起更新检查请求...')
  autoUpdater.checkForUpdates().catch(err => {
    console.error('========== 检查更新失败 ==========')
    console.error('错误:', err)
    console.error('错误消息:', err.message)
    console.error('错误代码:', err.code)
    console.error('================================')
    
    let errorDetail = err.message
    if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
      errorDetail = '无法解析 GitHub 域名，请检查：\n1. 网络连接是否正常\n2. DNS 设置是否正确\n3. 是否需要配置代理\n\n原始错误: ' + err.message
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      errorDetail = '连接 GitHub 超时，请检查：\n1. 是否可以访问 github.com\n2. 防火墙设置\n3. 代理配置\n\n原始错误: ' + err.message
    }
    
    if (manual) {
      mainWindow.webContents.send('update-error', {
        message: '检查更新失败',
        detail: errorDetail
      });
    }
  });
}

// IPC 处理器 - 获取游戏数据路径
ipcMain.handle('get-default-data-path', async () => {
  try {
    const gameDataPath = getGameDataPath()
    // 确保游戏数据目录存在
    await fs.mkdir(gameDataPath, { recursive: true })
    return { success: true, path: gameDataPath }
  } catch (error) {
    console.error('获取游戏数据路径失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 打开游戏数据目录
ipcMain.handle('open-game-data-directory', async () => {
  try {
    const { shell } = require('electron')
    const gameDataPath = getGameDataPath()
    await fs.mkdir(gameDataPath, { recursive: true })
    await shell.openPath(gameDataPath)
    return { success: true }
  } catch (error) {
    console.error('打开游戏数据目录失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    checkForUpdates(true)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 下载更新
ipcMain.handle('download-update', async () => {
  try {
    autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 安装更新
ipcMain.handle('install-update', async () => {
  try {
    // 使用 setImmediate 确保响应先发送给渲染进程
    setImmediate(() => {
      // quitAndInstall 会立即退出应用并安装更新
      // 参数: isSilent, isForceRunAfter
      autoUpdater.quitAndInstall(false, true)
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 获取应用版本
ipcMain.handle('get-app-version', async () => {
  try {
    return { success: true, version: app.getVersion() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 获取用户数据路径
ipcMain.handle('get-user-data-path', async () => {
  try {
    const userDataPath = getUserDataPath()
    // 确保用户数据目录存在
    await fs.mkdir(userDataPath, { recursive: true })
    return { success: true, path: userDataPath }
  } catch (error) {
    console.error('获取用户数据路径失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scan-directories', async (event, dirPath) => {
  try {
    const fullPath = path.resolve(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    return { success: true, directories };
  } catch (error) {
    console.error('扫描目录失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-files', async (event, dirPath, extension) => {
  try {
    let fullPath;
    
    // 如果是相对路径且以data开头，转换为绝对路径
    if (dirPath.startsWith('./data/') || dirPath.startsWith('data/')) {
      const gameDataPath = getGameDataPath();
      const relativePath = dirPath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      fullPath = path.join(gameDataPath, relativePath);
    } else {
      fullPath = path.resolve(dirPath);
    }
    
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    let files = entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
    
    // 如果指定了扩展名，进行过滤
    if (extension) {
      files = files.filter(file => file.endsWith(extension));
    }
    
    console.log(`扫描文件: ${fullPath}, 找到 ${files.length} 个文件`);
    return { success: true, files };
  } catch (error) {
    console.error('扫描文件失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC 处理器 - 文件操作
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    let actualPath = filePath;
    
    // 处理 userdata 路径（用户数据）
    if (filePath.startsWith('./userdata/') || filePath.startsWith('userdata/')) {
      const userDataPath = getUserDataPath();
      const relativePath = filePath.replace(/^\.?\/userdata\//, '').replace(/^userdata\//, '');
      actualPath = path.join(userDataPath, relativePath);
    }
    // 处理 data 路径（游戏数据）
    else if (filePath.startsWith('./data/') || filePath.startsWith('data/')) {
      const gameDataPath = getGameDataPath();
      const relativePath = filePath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      actualPath = path.join(gameDataPath, relativePath);
    }
    
    console.log('读取文件:', { originalPath: filePath, actualPath, gameDataPath: getGameDataPath() });
    const data = await fs.readFile(actualPath, 'utf8');
    return { success: true, data };
  } catch (error) {
    console.error('文件读取失败:', { filePath, actualPath, error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    let actualPath = filePath;
    
    // 处理 userdata 路径（用户数据）
    if (filePath.startsWith('./userdata/') || filePath.startsWith('userdata/')) {
      const userDataPath = getUserDataPath();
      const relativePath = filePath.replace(/^\.?\/userdata\//, '').replace(/^userdata\//, '');
      actualPath = path.join(userDataPath, relativePath);
      // 确保目录存在
      await fs.mkdir(path.dirname(actualPath), { recursive: true });
    }
    // 处理 data 路径（游戏数据）
    else if (filePath.startsWith('./data/') || filePath.startsWith('data/')) {
      const gameDataPath = getGameDataPath();
      const relativePath = filePath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      actualPath = path.join(gameDataPath, relativePath);
    }
    
    await fs.writeFile(actualPath, data, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  } catch (error) {
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    return { canceled: true, error: error.message };
  }
});

// 应用事件
app.whenReady().then(async () => {
  // 清理缓存以避免权限错误
  try {
    const { session } = require('electron')
    await session.defaultSession.clearCache()
    console.log('Cache cleared successfully') // 使用英文避免编码问题
  } catch (error) {
    console.log('Cache clearing failed, continuing startup:', error.message)
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})