import json
import os
import platform
import sys
from functools import cached_property
from pathlib import Path

__all__ = ['paths', 'init_paths', 'get_dbf_path']


class Paths:
    """
    定义工具将要用到的路径。

    约定：
    - 大写属性：只基于环境计算“默认路径”，不依赖 cache、无副作用。
    - 小写属性：基于 cache 的“当前生效路径”，读写都会更新 cache（不自动保存到磁盘）。
    """
    
    # ===== 默认路径（不依赖 cache、无副作用） =====
    
    @cached_property
    def DATA(self) -> Path:
        """应用信息存储位置（默认值）"""
        if os.name == "nt":  # Windows
            data = Path(os.environ["APPDATA"]) / "HearthstoneClientTool"
        elif sys.platform == "darwin":
            data = Path.home() / "Library" / "Application Support" / "HearthstoneClientTool"
        else:  # Linux
            data = Path.home() / ".cache" / "HearthstoneClientTool"
        return data
    
    @cached_property
    def OUTPUT(self) -> Path:
        """dbf 解压文件存储路径（默认值）"""
        if (config := (self.DATA / 'config.json')).exists():
            with config.open('r', encoding='utf-8') as f:
                path = json.load(f).get('customDataPath')
            if path:
                return Path(path)
        return self.DATA / 'Game Data'
    
    @cached_property
    def DBF(self) -> Path | None:
        """DBF 路径（默认值）"""
        return get_dbf_path()
    
    @cached_property
    def HEARTHSTONE_AGENT(self) -> Path:
        """
        agent 路径（默认值），用于获取 version。
        为了防止默认位置存在问题，给外部一个修改的位置。
        """
        return Path(r'C:\ProgramData\Battle.net\Agent\product.db')
    
    @cached_property
    def CACHE(self) -> Path:
        """缓存文件路径（默认值，仅返回路径，不创建目录）"""
        return self.DATA / 'auto-asset-tool-cache.json'
    
    # ===== 基于 cache 的“当前生效路径” =====
    
    @property
    def output(self) -> Path:
        """
        dbf 解压文件存储路径（可配置）。
        优先使用 cache 中的值，若不存在则回退到默认 OUTPUT。
        """
        from .cache import cache  # 延迟导入，避免循环依赖
        value = cache['output-dir']
        if not value:
            return self.OUTPUT
        return Path(value)
    
    @output.setter
    def output(self, value: str | Path) -> None:
        from .cache import cache
        p = Path(value)
        cache['output-dir'] = p.as_posix()
    
    @property
    def dbf(self) -> Path | None:
        """
        DBF 路径（可配置）。
        优先使用 cache 中的值，若不存在则回退到默认 DBF。
        """
        from .cache import cache
        value = cache['dbf-path']
        if not value:
            return self.DBF
        return Path(value)
    
    @dbf.setter
    def dbf(self, value: str | Path) -> None:
        from .cache import cache
        p = Path(value)
        cache['dbf-path'] = p.as_posix()
    
    @property
    def hearthstone_agent(self) -> Path:
        """
        agent 路径（可配置）。
        优先使用 cache 中的值，若不存在则回退到默认 HEARTHSTONE_AGENT。
        """
        from .cache import cache
        value = cache['agent-path']
        if not value:
            return self.HEARTHSTONE_AGENT
        return Path(value)
    
    @hearthstone_agent.setter
    def hearthstone_agent(self, value: str | Path) -> None:
        from .cache import cache
        p = Path(value)
        cache['agent-path'] = p.as_posix()


paths = Paths()


def init_paths() -> None:
    """
    程序启动时调用一次，用于创建必要目录。

    注意：不负责保存 cache，只负责文件系统上的 mkdir。
    cache 的 save 应该在程序退出时由入口统一调用。
    """
    # 基础数据目录
    paths.DATA.mkdir(parents=True, exist_ok=True)
    
    # 实际使用的输出目录（可能来自 cache，也可能是默认值）
    paths.output.mkdir(parents=True, exist_ok=True)
    
    # cache 文件所在目录
    paths.CACHE.parent.mkdir(parents=True, exist_ok=True)


def get_dbf_path() -> Path | None:
    if platform.system() != "Windows":
        return None
    # 仅仅当 windows 环境的时候使用 winreg
    import winreg
    try:
        key_path = r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Hearthstone"
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
            install_location, _ = winreg.QueryValueEx(key, "InstallLocation")
            return Path(install_location) / 'Data/Win/dbf.unity3d'
    except (OSError, FileNotFoundError):
        return None
