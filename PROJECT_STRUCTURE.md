# 项目结构说明

```
zeus/
├── src/                           # 源代码目录
│   ├── main/                      # 主进程代码
│   │   └── main.js               # Electron 主进程入口
│   ├── renderer/                  # 渲染进程代码
│   │   ├── index.html            # 主页面
│   │   ├── version-compare.html  # 版本对比页面
│   │   ├── version-compare.js    # 版本对比逻辑
│   │   └── version-compare.css   # 样式文件
│   └── preload/                  # 预加载脚本
│       └── preload.js           # 安全的API暴露
├── assets/                       # 静态资源
│   └── README.md                # 资源目录说明
├── config/                       # 配置文件
│   └── forge.config.js          # Electron Forge配置
├── data/                         # 数据文件 (Git忽略)
│   └── [版本数据文件夹]
├── node_modules/                 # 依赖包 (Git忽略)
├── out/                          # 构建输出 (Git忽略)
├── .git/                         # Git仓库
├── .gitignore                    # Git忽略规则
├── package.json                  # 项目配置
├── package-lock.json            # 依赖锁定
├── forge.config.js              # Forge配置副本
└── README.md                    # 项目说明
```

## 目录说明

### src/ - 源代码

- **main/**: Electron主进程代码，负责窗口管理、菜单、IPC通信等
- **renderer/**: 渲染进程代码，包含HTML、CSS、JavaScript前端代码
- **preload/**: 预加载脚本，安全地暴露Node.js API给渲染进程

### assets/ - 静态资源

存放应用程序图标、图片、字体等静态资源文件

### config/ - 配置文件

存放各种配置文件，包括构建配置、应用配置等

### data/ - 数据文件

存放版本对比的数据文件，该目录被Git忽略以避免大文件提交

## 优势

1. **清晰的职责分离**: 主进程、渲染进程、预加载脚本分别组织
2. **易于维护**: 相关文件归类存放，便于查找和修改
3. **规范化**: 遵循现代前端项目的标准目录结构
4. **可扩展**: 便于添加新功能和模块
