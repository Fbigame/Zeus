const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    // 包含默认版本数据
    extraResource: [
      'data'
    ],
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
      platforms: ['win32'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Windows安装包图标（移除网络依赖）
        setupIcon: './assets/icon.ico'
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
