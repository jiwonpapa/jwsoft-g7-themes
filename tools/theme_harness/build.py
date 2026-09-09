from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .checks import check_theme, source_files
from .errors import HarnessError
from .io import hash_files, sha256_file, write_json
from .model import Context


def _run(context: Context, command: list[str]) -> None:
    result = subprocess.run(command, cwd=context.theme, check=False, text=True)
    if result.returncode != 0:
        raise HarnessError(f"명령 실패({result.returncode}): {' '.join(command)}")


def _asset_paths(context: Context) -> list[Path]:
    template = json.loads((context.theme / "template.json").read_text(encoding="utf-8"))
    assets = template["assets"]
    return [context.theme / path for group in ("js", "css") for path in assets[group]]


def record_build(context: Context) -> None:
    artifacts = {
        path.relative_to(context.theme).as_posix(): sha256_file(path)
        for path in _asset_paths(context)
    }
    write_json(
        context.theme / "dist" / ".jw-build.json",
        {
            "schemaVersion": "1.0.0",
            "stackVersion": context.stack["stackVersion"],
            "stackHash": sha256_file(context.repository / "theme-stack.json"),
            "themeIdentifier": context.identifier,
            "themeVersion": context.version,
            "sourceHash": hash_files(context.theme, source_files(context)),
            "artifacts": dict(sorted(artifacts.items())),
        },
    )


def build_theme(context: Context) -> None:
    check_theme(context)
    _run(context, ["npm", "run", "typecheck"])
    _run(context, ["npm", "test"])
    _run(context, ["npm", "run", "build"])
    record_build(context)
    check_theme(context, release=True)
