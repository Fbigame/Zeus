import urllib.request
from pathlib import Path

from cache import cache
from path import paths
from product_db import ProductDB


def get_version(path: Path):
    version = get_version_from_agent(path)
    if not version:
        key = 'version-url'
        if key not in cache:
            cache[key] = 'http://cn.patch.battlenet.com.cn:1119/hsb/versions'
        version = get_version_from_web(cache[key])
    version: str
    # 检查 GAME_DATA 下是否已存在以 version 命名的文件夹，如存在则对末尾数字递增直至唯一
    base_path = paths.OUTPUT
    v_parts = version.split('.')
    if v_parts[-1].isnumeric():
        end = int(v_parts.pop())
    else:
        end = 0
    # 确保所有部分都为数字
    while True:
        version_folder = base_path / version
        if not version_folder.exists():
            break
        end += 1
        version = '.'.join(v_parts + [str(end)])
    return version


def get_version_from_agent(path: Path) -> str | None:
    """通过agent/product.db找到version"""
    if not path.exists():
        return None
    product_db: ProductDB = ProductDB()
    with path.open('rb') as f:
        product_db.ParseFromString(f.read())
    for app in product_db.app_configs:
        if app.app_id_short == 'hsb':
            return app.status_info.version_details[0].version_string
    return None


def get_version_from_web(url: str) -> str:
    """
    访问指定 url，解析返回内容，获取 cn 区的 VersionsName 字段（例如 34.2.0.231720）
    """
    with urllib.request.urlopen(url) as response:
        text = response.read().decode("utf-8")
    for line in text.splitlines():
        # 跳过表头和空行
        if line.startswith("cn|"):
            parts = line.strip().split("|")
            if len(parts) >= 6:
                return parts[5]
    raise RuntimeError("未能在网页内容中找到 cn 区版本号")
