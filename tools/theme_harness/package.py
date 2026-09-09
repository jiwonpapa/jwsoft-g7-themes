from __future__ import annotations

import json
import os
import tempfile
import zipfile
from pathlib import Path

from .build import build_theme
from .errors import HarnessError
from .io import sha256_file
from .model import Context

SKIP_NAMES = {".DS_Store", "node_modules", "__pycache__"}


def _runtime_files(context: Context) -> list[Path]:
    files: list[Path] = []
    for relative in context.stack["runtimeInclude"]:
        path = context.theme / relative
        if not path.exists():
            continue
        if path.is_symlink():
            raise HarnessError(f"배포 입력에 심볼릭 링크를 사용할 수 없습니다: {relative}")
        if path.is_file():
            files.append(path)
            continue
        for child in path.rglob("*"):
            if any(part in SKIP_NAMES for part in child.parts):
                continue
            if child.name == ".jw-build.json":
                continue
            if child.is_symlink():
                raise HarnessError(
                    f"배포 입력에 심볼릭 링크를 사용할 수 없습니다: {child.relative_to(context.theme)}"
                )
            if child.is_file():
                files.append(child)
    allowed_licenses = {
        notice["target"]
        for feature in context.features
        for notice in context.stack["features"][feature].get("notices", [])
    }
    files = [
        path
        for path in files
        if path.parent.name != "licenses" or path.name in allowed_licenses
    ]
    return sorted(set(files), key=lambda item: item.relative_to(context.theme).as_posix())


def _writestr(archive: zipfile.ZipFile, name: str, data: bytes) -> None:
    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    archive.writestr(info, data, compresslevel=9)


def write_package(context: Context, output_dir: Path | None = None) -> Path:
    files = _runtime_files(context)
    output_dir = output_dir or context.repository / "releases"
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{context.identifier}-{context.version}.zip"

    manifest = {
        "schemaVersion": "1.0.0",
        "stackVersion": context.stack["stackVersion"],
        "themeIdentifier": context.identifier,
        "themeVersion": context.version,
        "files": {
            path.relative_to(context.theme).as_posix(): sha256_file(path) for path in files
        },
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()

    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{context.identifier}-", suffix=".zip", dir=output_dir
    )
    os.close(file_descriptor)
    temporary = Path(temporary_name)
    try:
        with zipfile.ZipFile(temporary, "w") as archive:
            for path in files:
                _writestr(
                    archive,
                    path.relative_to(context.theme).as_posix(),
                    path.read_bytes(),
                )
            _writestr(archive, "JW-THEME-MANIFEST.json", manifest_bytes)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def package_theme(context: Context, output_dir: Path | None = None) -> Path:
    build_theme(context)
    return write_package(context, output_dir)
