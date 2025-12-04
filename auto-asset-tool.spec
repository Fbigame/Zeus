# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 收集 UnityPy 的所有数据文件和子模块
unitypy_datas = collect_data_files('UnityPy')
unitypy_hiddenimports = collect_submodules('UnityPy')

a = Analysis(
    ['run_tool.py'],
    pathex=['auto-asset-tool'],
    binaries=[],
    datas=unitypy_datas,
    hiddenimports=unitypy_hiddenimports + [
        'UnityPy.resources',
        'google.protobuf',
        'google.protobuf.internal',
        'cli',
        'cache',
        'path',
        'version',
        'product_db',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='auto-asset-tool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
