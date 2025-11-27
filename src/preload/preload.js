const { contextBridge, ipcRenderer } = require('electron')

// 暴露文件操作API给渲染进程
contextBridge.exposeInMainWorld('fileAPI', {
  // 通用文件操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // 文件夹操作
  scanDirectories: (dirPath) => ipcRenderer.invoke('scan-directories', dirPath),
  scanFiles: (dirPath, extension) => ipcRenderer.invoke('scan-files', dirPath, extension),
  
  // 获取路径
  getDefaultDataPath: () => ipcRenderer.invoke('get-default-data-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  
  // 打开游戏数据目录
  openGameDataDirectory: () => ipcRenderer.invoke('open-game-data-directory'),
  
  // 文件对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
})

// 暴露更新相关API
contextBridge.exposeInMainWorld('updateAPI', {
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  // 下载更新
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  // 安装更新
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // 监听更新事件
  onCheckingForUpdate: (callback) => ipcRenderer.on('checking-for-update', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error)),
  
  // 监听数据目录引导
  onShowDataDirectoryGuide: (callback) => ipcRenderer.on('show-data-directory-guide', (event, data) => callback(data))
})