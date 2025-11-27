const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { autoUpdater } = require('electron-updater')

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// 获取数据目录路径（开发时和打包后）
function getDataPath() {
  if (app.isPackaged) {
    // 打包后，data目录在resources目录下
    return path.join(process.resourcesPath, 'data')
  } else {
    // 开发时，data目录在项目根目录下
    return path.join(__dirname, '..', '..', 'data')
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
    title: '版本对比工具'
  })

  // 窗口准备好后最大化显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    
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
              title: '关于版本对比工具',
              message: '版本对比工具',
              detail: `一个基于 Electron 的版本对比工具\n版本: ${app.getVersion()}\n\n功能：\n• 版本对比\n• 差异分析\n• 结果导出`
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
  // 配置更新源
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Fbigame',
    repo: 'Zeus'
  });

  // 检查更新错误
  autoUpdater.on('error', (error) => {
    console.error('更新错误:', error);
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '更新失败',
        message: '检查更新时发生错误',
        detail: error.message
      });
    }
  });

  // 检查更新
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...');
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '正在检查更新...'
      });
    }
  });

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}`,
      detail: '是否现在下载？',
      buttons: ['下载', '稍后'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本');
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '已是最新版本',
        message: '当前已是最新版本'
      });
    }
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新下载完成',
      message: '更新已下载完成',
      detail: '应用将在退出后自动安装更新',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 开始检查更新
  autoUpdater.checkForUpdates().catch(err => {
    console.error('检查更新失败:', err);
  });
}

// IPC 处理器 - 获取默认数据路径
ipcMain.handle('get-default-data-path', async () => {
  try {
    const dataPath = getDataPath()
    // 检查data目录是否存在
    await fs.access(dataPath)
    return { success: true, path: dataPath }
  } catch (error) {
    console.error('获取默认数据路径失败:', error)
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
      const dataPath = getDataPath();
      const relativePath = dirPath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      fullPath = path.join(dataPath, relativePath);
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
    
    // 如果是相对路径且以data开头，转换为绝对路径
    if (filePath.startsWith('./data/') || filePath.startsWith('data/')) {
      const dataPath = getDataPath();
      // 移除路径开头的 data/ 部分，因为 dataPath 已经指向 data 目录
      const relativePath = filePath.replace(/^\.?\/data\//, '').replace(/^data\//, '');
      actualPath = path.join(dataPath, relativePath);
    }
    
    console.log('读取文件:', { originalPath: filePath, actualPath, dataPath: getDataPath() });
    const data = await fs.readFile(actualPath, 'utf8');
    return { success: true, data };
  } catch (error) {
    console.error('文件读取失败:', { filePath, actualPath, error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, data, 'utf8');
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