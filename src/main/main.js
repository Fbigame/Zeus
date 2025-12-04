const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { autoUpdater } = require('electron-updater')
const { spawn } = require('child_process')

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

// 配置更新日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

// 允许开发环境检查更新（用于测试）
const isDevEnvironment = !app.isPackaged
if (isDevEnvironment) {
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

// 获取配置文件路径
function getConfigPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'config.json')
}

// 读取配置
async function readConfig() {
  try {
    const configPath = getConfigPath()
    const data = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 配置文件不存在或读取失败，返回默认配置
    return {}
  }
}

// 写入配置
async function writeConfig(config) {
  try {
    const configPath = getConfigPath()
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('写入配置失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取游戏数据目录路径（支持自定义路径）
async function getGameDataPath() {
  const config = await readConfig()
  
  if (config.customDataPath) {
    // 使用自定义路径
    return path.join(config.customDataPath, 'Game Data')
  }
  
  // 使用默认路径
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
  const gameDataPath = await getGameDataPath()
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
          click: async () => {
            const { shell } = require('electron')
            const gameDataPath = await getGameDataPath()
            shell.openPath(gameDataPath)
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
  
  // 配置更新源 - 使用 GitHub Releases API，NSIS 格式
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Fbigame',
    repo: 'Zeus'
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
    const gameDataPath = await getGameDataPath()
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
    const gameDataPath = await getGameDataPath()
    await fs.mkdir(gameDataPath, { recursive: true })
    await shell.openPath(gameDataPath)
    return { success: true }
  } catch (error) {
    console.error('打开游戏数据目录失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 获取当前数据目录路径
ipcMain.handle('get-current-data-path', async () => {
  try {
    const gameDataPath = await getGameDataPath()
    const config = await readConfig()
    return { 
      success: true, 
      path: gameDataPath,
      isCustom: !!config.customDataPath,
      customBasePath: config.customDataPath || null
    }
  } catch (error) {
    console.error('获取当前数据路径失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 选择新的数据文件夹
ipcMain.handle('select-data-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择游戏数据存储位置',
      buttonLabel: '选择此文件夹'
    })
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    
    const selectedPath = result.filePaths[0]
    return { success: true, path: selectedPath }
  } catch (error) {
    console.error('选择数据文件夹失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 迁移数据到新目录
ipcMain.handle('migrate-data-directory', async (event, newBasePath) => {
  try {
    const oldGameDataPath = await getGameDataPath()
    const newGameDataPath = path.join(newBasePath, 'Game Data')
    
    console.log('开始数据迁移:')
    console.log('  源路径:', oldGameDataPath)
    console.log('  目标路径:', newGameDataPath)
    
    // 检查源目录是否存在
    let sourceExists = false
    let hasData = false
    try {
      await fs.access(oldGameDataPath)
      sourceExists = true
      const entries = await fs.readdir(oldGameDataPath)
      hasData = entries.length > 0
    } catch (error) {
      console.log('源目录不存在或为空')
    }
    
    // 创建新的Game Data目录
    await fs.mkdir(newGameDataPath, { recursive: true })
    
    // 如果源目录存在且有数据，则进行迁移
    if (sourceExists && hasData) {
      // 检查源路径和目标路径是否相同
      const isSamePath = path.normalize(oldGameDataPath).toLowerCase() === path.normalize(newGameDataPath).toLowerCase()
      
      if (isSamePath) {
        console.log('源路径和目标路径相同，无需迁移')
        return {
          success: true,
          newPath: newGameDataPath,
          migrated: false,
          deleted: false,
          message: '目标路径与当前路径相同，无需迁移。'
        }
      }
      
      console.log('开始复制数据...')
      await copyDirectory(oldGameDataPath, newGameDataPath)
      console.log('数据复制完成')
      
      // 删除原目录
      console.log('准备删除原目录:', oldGameDataPath)
      try {
        await fs.rm(oldGameDataPath, { recursive: true, force: true })
        console.log('✓ 原目录已成功删除')
      } catch (deleteError) {
        console.error('删除原目录失败:', deleteError)
        // 即使删除失败，也继续保存配置，因为数据已经复制成功
      }
    }
    
    // 保存新配置
    const config = await readConfig()
    config.customDataPath = newBasePath
    await writeConfig(config)
    
    console.log('配置已更新')
    
    return { 
      success: true, 
      newPath: newGameDataPath,
      migrated: hasData,
      deleted: hasData,
      message: hasData ? '数据迁移成功，原目录已删除！' : '新目录已设置，旧目录无数据需要迁移。'
    }
  } catch (error) {
    console.error('迁移数据失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理器 - 重置为默认数据目录
ipcMain.handle('reset-data-directory', async () => {
  try {
    const config = await readConfig()
    delete config.customDataPath
    await writeConfig(config)
    
    const defaultPath = path.join(app.getPath('userData'), 'Game Data')
    return { success: true, path: defaultPath }
  } catch (error) {
    console.error('重置数据目录失败:', error)
    return { success: false, error: error.message }
  }
})

// 递归复制目录
async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true })
  
  const entries = await fs.readdir(source, { withFileTypes: true })
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destPath = path.join(destination, entry.name)
    
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath)
    } else {
      await fs.copyFile(sourcePath, destPath)
    }
  }
}

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

// IPC 处理器 - 运行自动资源提取工具
ipcMain.handle('run-auto-asset-tool', async (event, options = {}) => {
  console.log('========================================')
  console.log('开始运行自动资源提取工具')
  console.log('传入参数:', JSON.stringify(options, null, 2))
  console.log('========================================')
  
  try {
    // 获取工具路径
    let toolPath
    if (isDevEnvironment) {
      // 开发环境：使用 process.cwd() 获取当前工作目录（项目根目录）
      const projectRoot = process.cwd()
      toolPath = path.join(projectRoot, 'tools', 'auto-asset-tool.exe')
    } else {
      // 打包后：在 resources 目录下
      toolPath = path.join(process.resourcesPath, 'tools', 'auto-asset-tool.exe')
    }
    
    console.log('环境信息:')
    console.log('  isDevEnvironment:', isDevEnvironment)
    console.log('  工具路径:', toolPath)
    console.log('  __dirname:', __dirname)
    console.log('  process.cwd():', process.cwd())
    console.log('  app.getAppPath():', app.getAppPath())
    console.log('  app.isPackaged:', app.isPackaged)
    
    // 检查工具是否存在
    console.log('检查工具文件是否存在...')
    try {
      await fs.access(toolPath)
      console.log('✓ 工具文件存在')
    } catch (error) {
      console.error('✗ 工具文件不存在:', error)
      return { 
        success: false, 
        error: `自动资源提取工具未找到: ${toolPath}\n请确保 tools/auto-asset-tool.exe 存在` 
      }
    }
    
    // 构建命令参数
    const args = []
    if (options.force) {
      args.push('-f')
    }
    if (options.dbfPath) {
      args.push('--dbf-path', options.dbfPath)
    }
    if (options.output) {
      args.push('--output', options.output)
    }
    if (options.agentPath) {
      args.push('--agent-path', options.agentPath)
    }
    
    console.log('执行命令:', toolPath)
    console.log('命令参数:', args)
    console.log('完整命令:', [toolPath, ...args].join(' '))
    console.log('========================================')
    
    return new Promise((resolve) => {
      const startTime = Date.now()
      console.log('启动子进程...')
      
      const child = spawn(toolPath, args, {
        cwd: path.dirname(toolPath),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      })
      
      console.log('子进程 PID:', child.pid)
      
      let stdout = ''
      let stderr = ''
      let outputLineCount = 0
      
      child.stdout.on('data', (data) => {
        const output = data.toString('utf8')
        stdout += output
        outputLineCount++
        console.log(`[stdout #${outputLineCount}]`, output.trim())
        // 发送实时输出到渲染进程
        event.sender.send('auto-asset-tool-output', { type: 'stdout', data: output })
      })
      
      child.stderr.on('data', (data) => {
        const output = data.toString('utf8')
        stderr += output
        console.error('[stderr]', output.trim())
        // 发送实时输出到渲染进程
        event.sender.send('auto-asset-tool-output', { type: 'stderr', data: output })
      })
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime
        console.log('========================================')
        console.log(`子进程退出，代码: ${code}`)
        console.log(`执行时间: ${duration}ms`)
        console.log(`输出行数: ${outputLineCount}`)
        console.log(`stdout 长度: ${stdout.length} 字节`)
        console.log(`stderr 长度: ${stderr.length} 字节`)
        console.log('========================================')
        
        if (code === 0) {
          console.log('✅ 工具执行成功')
          resolve({ 
            success: true, 
            message: '数据提取完成！',
            stdout,
            stderr
          })
        } else {
          console.error('❌ 工具执行失败')
          if (stderr) {
            console.error('错误输出:', stderr)
          }
          resolve({ 
            success: false, 
            error: `工具执行失败 (退出代码: ${code})`,
            stdout,
            stderr
          })
        }
      })
      
      child.on('error', (error) => {
        console.error('========================================')
        console.error('❌ 子进程启动错误:', error)
        console.error('错误类型:', error.name)
        console.error('错误消息:', error.message)
        console.error('========================================')
        resolve({ 
          success: false, 
          error: `工具执行错误: ${error.message}`,
          stdout,
          stderr
        })
      })
    })
  } catch (error) {
    console.error('========================================')
    console.error('❌ 运行 auto-asset-tool 失败:', error)
    console.error('错误堆栈:', error.stack)
    console.error('========================================')
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
    let fullPath;
    
    // 如果是相对路径且以data开头，转换为绝对路径
    if (dirPath.startsWith('./data/') || dirPath.startsWith('data/')) {
      const gameDataPath = await getGameDataPath();
      const relativePath = dirPath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      fullPath = path.join(gameDataPath, relativePath);
    } else {
      fullPath = path.resolve(dirPath);
    }
    
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
      const gameDataPath = await getGameDataPath();
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
  let actualPath = filePath;
  try {
    // 处理 userdata 路径（用户数据）
    if (filePath.startsWith('./userdata/') || filePath.startsWith('userdata/')) {
      const userDataPath = getUserDataPath();
      const relativePath = filePath.replace(/^\.?\/userdata\//, '').replace(/^userdata\//, '');
      actualPath = path.join(userDataPath, relativePath);
    }
    // 处理 data 路径（游戏数据）
    else if (filePath.startsWith('./data/') || filePath.startsWith('data/')) {
      const gameDataPath = await getGameDataPath();
      const relativePath = filePath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      actualPath = path.join(gameDataPath, relativePath);
    }
    
    console.log('读取文件:', { originalPath: filePath, actualPath });
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
      const gameDataPath = await getGameDataPath();
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