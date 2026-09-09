from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .errors import HarnessError
from .io import hash_files, read_json, sha256_file
from .model import Context, expected_packages
from .toolchain import check_toolchain

REQUIRED_FILES = (
    "package.json",
    "package-lock.json",
    "theme.harness.json",
    "template.json",
    "components.json",
    "routes.json",
    "vite.config.ts",
    "tsconfig.json",
    "THIRD-PARTY-NOTICES.md",
)
IGNORED_PARTS = {".git", "node_modules", "releases", "__pycache__"}
NETWORK_PATTERNS = (
    re.compile(r"(?:src|href)\s*=\s*[\"']https?://", re.IGNORECASE),
    re.compile(r"(?:fetch|import)\s*\(\s*[\"']https?://", re.IGNORECASE),
    re.compile(r"url\(\s*[\"']?https?://", re.IGNORECASE),
    re.compile(r"@import\s+[\"']https?://", re.IGNORECASE),
)


def source_files(context: Context) -> list[Path]:
    files: list[Path] = []
    for relative in ("assets", "src"):
        root = context.theme / relative
        if root.is_dir():
            files.extend(path for path in root.rglob("*") if path.is_file())
    for relative in (
        "package.json",
        "package-lock.json",
        "theme.harness.json",
        "vite.config.ts",
        "tsconfig.json",
    ):
        path = context.theme / relative
        if path.is_file():
            files.append(path)
    return files


def _check_shell_policy(repository: Path, issues: list[str]) -> None:
    for path in repository.rglob("*"):
        if not path.is_file() or path.suffix not in {".sh", ".bash", ".zsh"}:
            continue
        if any(part in IGNORED_PARTS for part in path.parts):
            continue
        executable = []
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or stripped == "set -euo pipefail":
                continue
            executable.append(stripped)
        if len(executable) != 1 or not executable[0].startswith("exec "):
            issues.append(
                f"셸 진입점은 단일 exec 명령만 허용합니다: {path.relative_to(repository)}"
            )


def _check_packages(context: Context, issues: list[str]) -> None:
    package = read_json(context.theme / "package.json")
    if package.get("packageManager") != context.stack["packageManager"]:
        issues.append("package.json packageManager가 중앙 스택과 다릅니다. setup을 실행하세요.")
    expected_dependencies, expected_dev_dependencies = expected_packages(context)
    for section, expected in (
        ("dependencies", expected_dependencies),
        ("devDependencies", expected_dev_dependencies),
        ("scripts", context.stack["requiredScripts"]),
    ):
        actual = package.get(section)
        if actual != expected:
            issues.append(f"package.json {section}이 중앙 스택과 다릅니다. setup을 실행하세요.")

    lock_path = context.theme / "package-lock.json"
    if not lock_path.is_file():
        return
    lock = read_json(lock_path)
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        issues.append("package-lock.json packages가 없습니다.")
        return
    for name, version in {**expected_dependencies, **expected_dev_dependencies}.items():
        entry = packages.get(f"node_modules/{name}")
        if not isinstance(entry, dict) or entry.get("version") != version:
            issues.append(f"잠금 버전 불일치: {name}@{version}")


def _check_manifests(context: Context, issues: list[str], *, release: bool) -> None:
    template = read_json(context.theme / "template.json")
    components = read_json(context.theme / "components.json")
    if template.get("identifier") != context.identifier:
        issues.append("template.json identifier가 theme.harness.json과 다릅니다.")
    if template.get("version") != context.version:
        issues.append("template.json version이 theme.harness.json과 다릅니다.")
    if components.get("templateId") != context.identifier:
        issues.append("components.json templateId가 theme.harness.json과 다릅니다.")
    if components.get("version") != context.version:
        issues.append("components.json version이 theme.harness.json과 다릅니다.")
    if template.get("externals") not in (None, []):
        issues.append("template.json externals는 비어 있어야 합니다.")

    assets = template.get("assets")
    if not isinstance(assets, dict):
        issues.append("template.json assets가 올바르지 않습니다.")
        return
    for group in ("js", "css"):
        values = assets.get(group)
        if not isinstance(values, list) or not values:
            issues.append(f"template.json assets.{group}가 비어 있습니다.")
            continue
        for value in values:
            if not isinstance(value, str) or (release and not (context.theme / value).is_file()):
                issues.append(f"선언된 배포 자산이 없습니다: {value}")


def _check_network_assets(context: Context, issues: list[str]) -> None:
    candidates: list[Path] = []
    for relative in ("assets", "src", "layouts", "lang"):
        root = context.theme / relative
        if root.is_dir():
            candidates.extend(path for path in root.rglob("*") if path.is_file())
    for path in candidates:
        if path.suffix.lower() not in {".css", ".js", ".ts", ".tsx", ".json", ".html"}:
            continue
        content = path.read_text(encoding="utf-8", errors="replace")
        if any(pattern.search(content) for pattern in NETWORK_PATTERNS):
            issues.append(f"실행 자산의 외부 URL은 허용되지 않습니다: {path.relative_to(context.theme)}")


def _check_tailwind(context: Context, issues: list[str]) -> None:
    if "tailwind" not in context.features:
        return
    css_path = context.theme / "assets" / "base.css"
    vite_path = context.theme / "vite.config.ts"
    css = css_path.read_text(encoding="utf-8") if css_path.is_file() else ""
    vite = vite_path.read_text(encoding="utf-8") if vite_path.is_file() else ""
    required_css = ("tailwindcss/theme.css", "tailwindcss/utilities.css", "prefix(jw)")
    if any(token not in css for token in required_css):
        issues.append("Tailwind theme/utilities와 jw prefix 설정이 필요합니다.")
    if re.search(r'@import\s+["\']tailwindcss["\']', css):
        issues.append("전역 Tailwind Preflight import는 허용하지 않습니다.")
    if "@tailwindcss/vite" not in vite or "tailwindcss()" not in vite:
        issues.append("Vite에 @tailwindcss/vite 설정이 필요합니다.")


def _check_licenses(context: Context, issues: list[str]) -> None:
    notices_path = context.theme / "THIRD-PARTY-NOTICES.md"
    notices_text = notices_path.read_text(encoding="utf-8") if notices_path.is_file() else ""
    for feature in context.features:
        for notice in context.stack["features"][feature].get("notices", []):
            target = context.theme / "licenses" / notice["target"]
            if not target.is_file():
                issues.append(f"라이선스 원문이 없습니다: licenses/{notice['target']}")
            elif notice.get("sha256") and sha256_file(target) != notice["sha256"]:
                issues.append(f"라이선스 원문 해시가 다릅니다: licenses/{notice['target']}")
            if notice["package"] not in notices_text or notice["version"] not in notices_text:
                issues.append(f"제3자 고지가 없습니다: {notice['package']}@{notice['version']}")


def _check_build_state(context: Context, issues: list[str]) -> None:
    state_path = context.theme / "dist" / ".jw-build.json"
    if not state_path.is_file():
        issues.append("릴리스 빌드 상태가 없습니다. build를 실행하세요.")
        return
    state = read_json(state_path)
    if state.get("stackHash") != sha256_file(context.repository / "theme-stack.json"):
        issues.append("중앙 스택이 마지막 빌드 후 변경되었습니다. build를 다시 실행하세요.")
    sources = source_files(context)
    if state.get("sourceHash") != hash_files(context.theme, sources):
        issues.append("소스가 마지막 빌드 후 변경되었습니다. build를 다시 실행하세요.")
    artifacts = state.get("artifacts")
    if not isinstance(artifacts, dict):
        issues.append("빌드 상태의 artifacts가 올바르지 않습니다.")
        return
    for relative, expected_hash in artifacts.items():
        path = context.theme / relative
        if not path.is_file() or sha256_file(path) != expected_hash:
            issues.append(f"빌드 자산 해시가 다릅니다: {relative}")


def collect_issues(context: Context, *, release: bool = False) -> list[str]:
    issues: list[str] = []
    for relative in REQUIRED_FILES:
        if not (context.theme / relative).is_file():
            issues.append(f"필수 파일이 없습니다: {relative}")
    if issues:
        return issues
    _check_shell_policy(context.repository, issues)
    _check_packages(context, issues)
    _check_manifests(context, issues, release=release)
    _check_network_assets(context, issues)
    _check_tailwind(context, issues)
    _check_licenses(context, issues)
    if release:
        _check_build_state(context, issues)
    return issues


def check_theme(context: Context, *, release: bool = False) -> None:
    check_toolchain(context)
    issues = collect_issues(context, release=release)
    if issues:
        raise HarnessError("테마 검사 실패:\n- " + "\n- ".join(issues))
