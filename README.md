# Hearthstone Client Tool

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Electron](https://img.shields.io/badge/Electron-39.0.0-47848f.svg)

一个强大的炉石传说客户端数据分析工具，提供版本对比、数据查看、套牌规则集分析等功能。

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用指南](#使用指南) • [开发说明](#开发说明)

</div>

---

## 📋 功能特性

### 🔍 版本对比
- **智能版本检测**：自动扫描并识别游戏数据版本
- **深度数据对比**：对比两个版本间的卡牌、成就、套牌等数据差异
- **详细差异分析**：清晰展示新增、修改、删除的记录
- **多格式导出**：支持导出 TXT、Excel 格式的对比报告
- **CardID 专项导出**：针对卡牌 ID 的快速导出功能

### 📊 数据查看器
- **卡牌数据查看**：浏览和搜索所有卡牌信息
- **成就系统查看**：查看成就分类、条件、奖励等详细信息
- **套牌模板查看**：分析预设套牌模板及卡牌组成
- **实时搜索过滤**：快速定位目标数据

### 🎯 套牌规则集分析
- **规则集查看**：查看所有套牌规则集及其规则
- **规则类型解析**：30+ 种规则类型的中文解释
- **子集详情**：查看规则关联的子集及其规则
- **GameTag 映射**：自动解析游戏标签 ID 为可读名称
- **智能备注系统**：
  - 为规则集、规则、子集添加自定义备注
  - 自动同步相同规则的备注
  - 备注数据本地持久化保存
- **规则集对比**：
  - 多选规则集进行对比分析
  - 清晰展示规则类型差异
  - 一键全选功能
  - 自动同步备注到相同规则

### 🔄 自动更新
- **自动检查更新**：启动时自动检查新版本
- **后台下载**：更新包后台下载，不影响使用
- **一键安装**：下载完成后提示重启安装
- **手动检查**：菜单中随时检查更新

## 🚀 快速开始

### 安装

#### 从 Release 下载（推荐）
1. 访问 [Releases 页面](https://github.com/Fbigame/Zeus/releases)
2. 下载最新版本的安装包（`.exe` 文件）
3. 运行安装程序，按提示完成安装
4. 应用会自动创建桌面快捷方式和开始菜单项

#### 从源码构建
```bash
# 克隆仓库
git clone https://github.com/Fbigame/Zeus.git
cd Zeus

# 安装依赖
npm install

# 开发模式运行
npm start

# 构建安装包
npm run make
```

### 准备数据
将游戏数据文件放置在以下位置：
```
应用安装目录/resources/data/
├── 34.0.2.231191/
│   ├── CARD.json
│   ├── ACHIEVEMENT.json
│   ├── DECK_RULESET.json
│   └── ...
├── 34.0.0.229984/
└── ...
```

## 📖 使用指南

### 版本对比
1. 在主页点击「版本对比」进入对比界面
2. 点击「🔍 检测版本」扫描可用版本
3. 选择旧版本和新版本
4. 选择要对比的数据类型（卡牌、成就等）
5. 点击「🔍 开始对比」查看结果
6. 使用「💾 导出」功能保存对比报告

### 数据查看
1. 在主页选择要查看的数据类型
2. 选择版本并点击「加载数据」
3. 使用搜索框快速定位数据
4. 点击数据项查看详细信息

### 套牌规则集分析
1. 点击「套牌规则集」进入分析界面
2. 选择版本并加载规则集
3. 点击规则集查看详细规则
4. 点击规则 ID 可添加/编辑备注
5. 点击子集 ID 查看子集详情和规则
6. 使用对比模式：
   - 点击「进入对比模式」
   - 选择多个规则集（支持全选）
   - 点击「对比选中的规则集」
   - 查看规则类型对比表格
   - 系统自动同步相同规则的备注

### 备注管理
- **添加备注**：点击规则 ID 或在子集详情页输入备注
- **自动保存**：子集备注失焦自动保存，规则备注点击保存按钮
- **备注同步**：对比时自动将有备注的规则同步到相同的无备注规则
- **存储位置**：备注保存在用户数据目录，不会被删除

## 🛠️ 技术栈

- **框架**：Electron 39.0.0
- **语言**：JavaScript (ES6+)
- **UI**：HTML5 + CSS3
- **数据处理**：ExcelJS
- **自动更新**：electron-updater
- **构建工具**：Electron Forge

## 📁 项目结构

```
Zeus/
├── src/
│   ├── main/
│   │   └── main.js              # Electron 主进程
│   ├── renderer/
│   │   ├── index.html           # 主页
│   │   ├── version-compare.html # 版本对比
│   │   ├── data-viewer.html     # 数据查看器
│   │   ├── deck-ruleset.html    # 套牌规则集
│   │   ├── shared-config.js     # 共享配置
│   │   └── game-tags.js         # GameTag 映射
│   └── preload/
│       └── preload.js           # 预加载脚本
├── assets/
│   └── icon.ico                 # 应用图标
├── data/                        # 游戏数据目录（本地）
├── .github/
│   └── workflows/
│       └── build-release.yml    # GitHub Actions 配置
├── forge.config.js              # Electron Forge 配置
├── package.json
└── README.md
```

## 👨‍💻 开发说明

### 开发模式
```bash
npm start
```

### 构建应用
```bash
# 打包应用（不创建安装包）
npm run package

# 创建安装包
npm run make

# 构建并发布到 GitHub（需要 GITHUB_TOKEN）
npm run publish
```

### 发布新版本
```bash
# 1. 更新 package.json 中的版本号
# 2. 提交更改
git add .
git commit -m "Release v1.0.2"

# 3. 创建并推送标签
git tag v1.0.2
git push origin main
git push origin v1.0.2

# GitHub Actions 会自动构建并创建 Release
```

### 数据目录说明
- **开发环境**：`项目根目录/data/`
- **生产环境**：`应用安装目录/resources/data/`
- **用户数据**：`%APPDATA%/heathstone-client-tool/`（备注等）

### 配置文件
- `forge.config.js`：Electron Forge 配置，控制打包和构建行为
- `shared-config.js`：前端共享配置，定义数据文件映射关系
- `game-tags.js`：GameTag ID 到名称的映射表

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License

## 🔗 相关链接

- [GitHub 仓库](https://github.com/Fbigame/Zeus)
- [问题反馈](https://github.com/Fbigame/Zeus/issues)
- [版本发布](https://github.com/Fbigame/Zeus/releases)

---

<div align="center">

Made with ❤️ by Fbigame

</div>
