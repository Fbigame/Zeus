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