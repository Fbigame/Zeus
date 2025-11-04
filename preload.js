const { contextBridge, ipcRenderer } = require('electron')

// 暴露游戏相关的 API 给渲染进程
contextBridge.exposeInMainWorld('gamesAPI', {
  // 启动游戏
  launchGame: (gameName) => ipcRenderer.invoke('launch-game', gameName),
  
  // 获取系统信息
  getTimestamp: () => Date.now(),
  log: (message) => console.log(message)
})

// 暴露文件操作API给渲染进程
contextBridge.exposeInMainWorld('fileAPI', {
  // GameTags文件操作
  saveGameTags: (data) => ipcRenderer.invoke('save-game-tags', data),
  loadGameTags: () => ipcRenderer.invoke('load-game-tags'),
  
  // 枚举数据保存
  saveEnumData: (enumType, data) => ipcRenderer.invoke('save-enum-data', enumType, data),
  
  // 通用文件操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // 文件夹操作
  scanDirectories: (dirPath) => ipcRenderer.invoke('scan-directories', dirPath),
  
  // 文件对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
})