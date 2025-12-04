"""
Auto Asset Tool - 入口文件
用于 PyInstaller 打包
"""
import sys
from pathlib import Path

# 添加 auto-asset-tool 目录到 sys.path
tool_dir = Path(__file__).parent / 'auto-asset-tool'
sys.path.insert(0, str(tool_dir))

# 导入并运行
from cli import main

if __name__ == '__main__':
    main()
