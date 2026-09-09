from __future__ import annotations

import shutil
from pathlib import Path

from .errors import HarnessError
from .io import read_json, sha256_file
from .model import Context


def _package_license(theme: Path, package_name: str) -> Path | None:
    package = theme / "node_modules" / package_name
    if not package.is_dir():
        return None
    matches = sorted(
        path for path in package.iterdir() if path.is_file() and path.name.upper().startswith("LICENSE")
    )
    return matches[0] if matches else None


def sync_licenses(context: Context) -> None:
    licenses_dir = context.theme / "licenses"
    licenses_dir.mkdir(parents=True, exist_ok=True)
    notices: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for feature in context.features:
        for notice in context.stack["features"][feature].get("notices", []):
            key = (notice["package"], notice["version"])
            if key in seen:
                continue
            seen.add(key)
            source = _package_license(context.theme, notice["package"])
            if source is None and notice.get("fallback"):
                source = context.repository / notice["fallback"]
            if source is None or not source.is_file():
                raise HarnessError(
                    f"라이선스 원문을 찾을 수 없습니다: {notice['package']}@{notice['version']}"
                )
            package = read_json(context.theme / "node_modules" / notice["package"] / "package.json")
            if package.get("version") != notice["version"] or package.get("license") != notice["license"]:
                raise HarnessError(
                    f"패키지 라이선스 메타데이터가 중앙 스택과 다릅니다: {notice['package']}"
                )
            target = licenses_dir / notice["target"]
            shutil.copyfile(source, target)
            if notice.get("sha256") and sha256_file(target) != notice["sha256"]:
                raise HarnessError(f"라이선스 원문 해시가 다릅니다: {notice['package']}")
            notices.append(notice)

    lines = [
        "# 제3자 고지",
        "",
        "이 파일은 JW Theme Harness가 theme-stack.json의 선택 기능에서 생성했습니다.",
        "",
        "| 패키지 | 버전 | 라이선스 | 동봉 원문 |",
        "|---|---:|---|---|",
    ]
    for notice in notices:
        lines.append(
            f"| {notice['package']} | {notice['version']} | {notice['license']} | licenses/{notice['target']} |"
        )
    lines.extend(
        [
            "",
            "React와 ReactDOM은 G7 호스트 런타임을 사용하며 테마 배포물에 포함하지 않습니다.",
            "",
        ]
    )
    (context.theme / "THIRD-PARTY-NOTICES.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
