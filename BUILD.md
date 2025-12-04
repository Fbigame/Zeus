# 构建说明

## 本地开发构建

### 完整构建（推荐）
```powershell
npm run build:local
```
这个命令会：
1. 构建 Python 工具 (`auto-asset-tool.exe`)
2. 将工具复制到 `tools/` 目录
3. 构建 Electron 应用

### 分步构建

#### 1. 仅构建 Python 工具
```powershell
npm run build:python
```

#### 2. 仅构建 Electron 应用
```powershell
npm run make
```

## CI/CD 构建

GitHub Actions 会自动处理构建流程：

1. **构建 Python 工具**
   - 使用 Python 3.10
   - 运行 PyInstaller
   - 上传 `auto-asset-tool.exe` 为 artifact

2. **构建 Electron 应用**
   - 下载 Python 工具 artifact 到 `tools/` 目录
   - 使用 electron-builder 构建
   - 创建安装包和 zip

3. **发布 Release**
   - 当推送 tag（如 `v1.4.6`）时自动创建 GitHub Release
   - 上传所有构建产物

## 目录结构

```
Zeus/
├── auto-asset-tool/        # Python 工具源码
├── tools/                  # Python 工具输出目录（不提交到 git）
│   └── auto-asset-tool.exe
├── dist/                   # Electron 构建输出（不提交到 git）
│   ├── *.exe
│   └── *.zip
└── out/                    # electron-forge 输出（不提交到 git）
```

## 发布新版本

1. 更新 `package.json` 中的版本号
2. 提交更改
3. 创建并推送 tag：
   ```bash
   git tag v1.4.7
   git push Fbigame-Zeus v1.4.7
   ```
4. GitHub Actions 会自动构建并创建 Release
