const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

// 检查 data 目录是否存在
const dataPath = path.join(__dirname, 'data');
const hasDataDir = fs.existsSync(dataPath);

module.exports = {
  packagerConfig: {
    asar: true,
    // 仅在 data 目录存在时包含它
    extraResource: hasDataDir ? ['data'] : [],
    // 应用图标配置 - 使用绝对路径
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    // 排除data目录不被复制到app.asar中
    ignore: [
      /^\/data$/,
      /^\/data\//
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Windows安装包图标
        setupIcon: './assets/icon.ico',
        // 应用显示名称
        name: 'HearthstoneClientTool',
        title: 'Hearthstone Client Tool',
        // 安装程序可执行文件名
        setupExe: 'HearthstoneClientToolSetup.exe',
        // 应用图标（显示在控制面板）
        iconUrl: 'https://raw.githubusercontent.com/Fbigame/Zeus/main/assets/icon.ico',
        // 不静默安装
        noMsi: true,
        // 允许卸载
        remoteReleases: false
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Fbigame',
          name: 'Zeus'
        },
        prerelease: false,
        draft: false
      }
    }
  ],
  plugins: [
    // 移除可能需要网络的插件
    // {
    //   name: '@electron-forge/plugin-auto-unpack-natives',
    //   config: {},
    // },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
