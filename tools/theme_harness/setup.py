from __future__ import annotations

import subprocess

from .errors import HarnessError
from .io import read_json, write_json
from .licenses import sync_licenses
from .model import Context, expected_packages
from .toolchain import check_toolchain


def configure_package(context: Context) -> None:
    package_path = context.theme / "package.json"
    package = read_json(package_path)
    expected_dependencies, expected_dev_dependencies = expected_packages(context)

    current_dependencies = package.get("dependencies", {})
    current_dev_dependencies = package.get("devDependencies", {})
    if not isinstance(current_dependencies, dict) or not isinstance(current_dev_dependencies, dict):
        raise HarnessError("package.json dependencies 형식이 올바르지 않습니다.")

    allowed = set(expected_dependencies) | set(expected_dev_dependencies)
    unknown = (set(current_dependencies) | set(current_dev_dependencies)) - allowed
    if unknown:
        raise HarnessError(
            "중앙 스택에 등록되지 않은 패키지가 있습니다: " + ", ".join(sorted(unknown))
        )

    package["scripts"] = dict(context.stack["requiredScripts"])
    package["packageManager"] = context.stack["packageManager"]
    package["dependencies"] = dict(sorted(expected_dependencies.items()))
    package["devDependencies"] = dict(sorted(expected_dev_dependencies.items()))
    write_json(package_path, package)


def install(context: Context) -> None:
    result = subprocess.run(
        ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund"],
        cwd=context.theme,
        check=False,
        text=True,
    )
    if result.returncode != 0:
        raise HarnessError(f"npm install 실패: 종료 코드 {result.returncode}")


def setup_theme(context: Context, *, install_packages: bool = True) -> None:
    check_toolchain(context)
    configure_package(context)
    if install_packages:
        install(context)
        sync_licenses(context)
