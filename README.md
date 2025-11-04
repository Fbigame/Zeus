# Zeus Editor & Game

一个基于 Electron 的多功能桌面应用程序，包含文本编辑器和 2D 游戏功能。

## 运行应用

### 开发模式

\`\`\`bash
npm start
\`\`\`

### 打包应用

\`\`\`bash
npm run package
\`\`\`

### 构建安装包

\`\`\`bash
npm run make
\`\`\`

## 项目结构

\`\`\`
zeus/
├── index.js # 主进程文件
├── preload.js # 预加载脚本
├── index.html # 主界面
├── styles.css # 样式文件
├── renderer.js # 渲染进程逻辑
├── package.json # 项目配置
├── forge.config.js # Electron Forge 配置
└── assets/ # 资源文件

```

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **HTML/CSS/JavaScript**: 前端技术
- **Node.js**: 后端 API

## 开发说明

这个项目是一个很好的 Electron 学习示例，包含了：

1. **主进程 (index.js)**:
   - 窗口管理
   - 菜单创建
   - 文件系统操作
   - IPC 通信

2. **渲染进程 (renderer.js)**:
   - 用户界面逻辑
   - 编辑器功能
   - 事件处理

3. **预加载脚本 (preload.js)**:
   - 安全的 API 暴露
   - 上下文隔离

4. **样式设计 (styles.css)**:
   - 现代化 UI
   - 响应式布局
   - VS Code 风格

## 扩展建议

你可以继续添加以下功能来学习更多 Electron 特性：

### 编辑器扩展：
- 语法高亮
- 查找替换
- 多标签页
- 插件系统
- 主题切换
- 自动保存
- 文件树视图

### 游戏扩展：
- 更多游戏类型（贪吃蛇、俄罗斯方块等）
- 多人游戏支持
- 音效和背景音乐
- 成就系统
- 游戏排行榜
- 自定义皮肤

## 游戏开发技术要点

这个 2D 游戏展示了以下重要的游戏开发概念：

1. **游戏循环 (Game Loop)**: 使用 `requestAnimationFrame` 实现流畅的 60fps 游戏循环
2. **状态管理**: 游戏状态机（菜单、游戏中、暂停、游戏结束）
3. **碰撞检测**: AABB（轴对齐包围盒）碰撞检测算法
4. **粒子系统**: 爆炸和升级特效的粒子系统
5. **输入处理**: 键盘事件监听和多键同时按下处理
6. **Canvas 绘图**: HTML5 Canvas 2D 上下文绘图 API
7. **动画和缓动**: 平滑的移动和视觉效果
8. **数据持久化**: 使用 localStorage 保存最高分

这是一个很好的学习 Electron 和游戏开发的综合项目！

## 许可证

MIT License
```
