from __future__ import annotations

import re
import subprocess
import sys

from .errors import HarnessError
from .model import Context


def _version_tuple(value: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", value.strip())
    if not match:
        raise HarnessError(f"도구 버전을 해석할 수 없습니다: {value}")
    return tuple(int(part) for part in match.groups())


def _command_version(command: str) -> str:
    result = subprocess.run(
        [command, "--version"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise HarnessError(f"필수 도구를 실행할 수 없습니다: {command}")
    return result.stdout.strip()


def check_toolchain(context: Context) -> None:
    requirements = context.stack["toolchain"]
    python_minimum = _version_tuple(requirements["pythonMinimum"])
    if sys.version_info[:3] < python_minimum:
        raise HarnessError(f"Python {requirements['pythonMinimum']} 이상이 필요합니다.")

    node_version = _command_version("node")
    if _version_tuple(node_version) < _version_tuple(requirements["nodeMinimum"]):
        raise HarnessError(f"Node {requirements['nodeMinimum']} 이상이 필요합니다.")

    package_manager, expected_npm = context.stack["packageManager"].split("@", 1)
    if package_manager != "npm":
        raise HarnessError(f"지원하지 않는 package manager입니다: {package_manager}")
    actual_npm = _command_version("npm")
    if actual_npm != expected_npm:
        raise HarnessError(f"npm {expected_npm}이 필요합니다. 현재 버전: {actual_npm}")
