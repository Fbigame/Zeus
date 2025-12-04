from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

import UnityPy
from tqdm import tqdm

from .cache import cache
from .path import paths, init_paths
from .version import get_version


def should_update():
    dbf_path = paths.DBF
    if not dbf_path.exists():
        raise FileNotFoundError(f"DBF file not found: {dbf_path}")
    import hashlib
    with dbf_path.open('rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    if file_hash != cache['dbf-hash']:
        cache['dbf-hash'] = file_hash
        return True
    return False


def parse_dbf(
        dbf_path: Path,
        output: Path,
) -> None:
    """解析 DBF 数据并将结果保存到指定目录。"""
    output.mkdir(parents=True, exist_ok=True)
    env = UnityPy.load(dbf_path.as_posix())
    # 统计需要处理的对象总数（仅 MonoBehaviour 类型）用于进度条
    objects = [obj for obj in env.objects if obj.type.name == 'MonoBehaviour']
    for obj in tqdm(objects, desc="解析 DBF 文件", unit="文件"):
        data = obj.read_typetree()
        with open(output / f'{data["m_Name"]}.join', 'w', encoding='utf-8') as f:
            json.dump(data, f)


def _normalize_default(path: Path | None) -> Path | None:
    if path is None:
        return None
    value = path.as_posix()
    if value in ("", ".", "./"):
        return None
    return path


def _build_parser() -> argparse.ArgumentParser:
    default_dbf = _normalize_default(paths.dbf)
    default_output = _normalize_default(paths.output) or Path.cwd()
    default_agent = _normalize_default(paths.hearthstone_agent)
    
    parser = argparse.ArgumentParser(
        prog="auto-asset-tool",
        description="解析炉石客户端 DBF 数据，并将结果保存到本地。",
    )
    parser.add_argument(
        "--dbf-path",
        type=Path,
        required=default_dbf is None,
        default=default_dbf,
        help="DBF 数据目录；若省略则尝试使用缓存配置；不存在缓存则通过注册表找到路径。",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=default_output is None,
        default=default_output,
        help=f"解析结果输出目录，默认 {default_output}",
    )
    parser.add_argument(
        "--agent-path",
        type=Path,
        required=default_agent is None,
        default=default_agent,
        help=f"Battle.net Agent product.db 路径；若省略则尝试使用缓存配置；不存在缓存则返回{paths.HEARTHSTONE_AGENT}。",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="强制覆盖已有输出等潜在危险操作。",
    )
    return parser


def _parse_cli(argv: Sequence[str]) -> tuple[Path, Path, Path, bool]:
    parser = _build_parser()
    args = parser.parse_args(argv)
    
    dbf_path: Path = args.dbf_path
    output_dir: Path = args.output
    agent_path: Path = args.agent_path
    force: bool = args.force
    
    if not dbf_path.exists():
        parser.error("指定的 DBF 路径不存在：{dbf_path}")
    if not agent_path.exists():
        parser.error("指定的 Agent 路径不存在：{agent_path}")
    
    output_dir.mkdir(parents=True, exist_ok=True)
    return dbf_path, output_dir, agent_path, force


def main() -> None:
    """
    CLI 入口：仅负责读取系统参数并转交给 parse_and_save。
    """
    dbf_path, output_dir, agent_path, force = _parse_cli(sys.argv[1:])
    if force or should_update():
        init_paths()
        parse_dbf(
            dbf_path=dbf_path,
            output=output_dir / get_version(agent_path),
        )
        # 最后进行cache的保存，防止中途报错导致错误缓存
        cache.save()


if __name__ == "__main__":
    main()
