# 发布指南

## 自动发布流程

### 1. 创建新版本

更新 `package.json` 中的版本号：

```json
{
  "version": "1.0.1"
}
```

### 2. 提交更改

```bash
git add .
git commit -m "Release v1.0.1"
```

### 3. 创建并推送标签

```bash
# 创建标签
git tag v1.0.1

# 推送代码和标签
git push origin main
git push origin v1.0.1
```

### 4. 自动构建和发布

推送标签后，GitHub Actions 会自动：
- ✅ 在 Windows、macOS、Linux 上构建应用
- ✅ 生成安装包（.exe、.dmg、.deb、.rpm）
- ✅ 创建 GitHub Release
- ✅ 上传所有构建产物

### 5. 用户自动更新

用户打开应用后会自动检查更新：
- 🔔 发现新版本时弹出提示
- 📥 一键下载更新
- 🔄 退出后自动安装

## 手动发布（可选）

如果需要手动发布：

```bash
# 设置 GitHub Token
export GITHUB_TOKEN=your_token_here  # Linux/Mac
# 或
set GITHUB_TOKEN=your_token_here     # Windows

# 构建并发布
npm run publish
```

## 版本号规范

采用语义化版本号：`主版本号.次版本号.修订号`

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

示例：
- `1.0.0` → `1.0.1`：Bug 修复
- `1.0.0` → `1.1.0`：新增功能
- `1.0.0` → `2.0.0`：重大更新

## 注意事项

1. **标签格式**：必须以 `v` 开头，如 `v1.0.0`
2. **版本一致**：标签版本要与 package.json 中的版本一致
3. **GitHub Token**：GitHub Actions 自动使用 `GITHUB_TOKEN`，无需额外配置
4. **构建时间**：完整构建可能需要 10-20 分钟
5. **Release 资产**：所有平台的安装包会自动上传到 Release 页面

## 常见问题

### Q: 如何删除错误的 Release？

在 GitHub Releases 页面删除对应的 Release 和 Tag，然后重新创建。

### Q: 构建失败怎么办？

检查 GitHub Actions 日志，常见原因：
- 版本号格式错误
- 依赖安装失败
- 代码语法错误

### Q: 如何禁用自动更新？

修改 `src/main/main.js` 中的 `checkForUpdates()` 调用。
