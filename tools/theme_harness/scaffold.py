from __future__ import annotations

import re
import shutil
from pathlib import Path

from .errors import HarnessError
from .model import load_context
from .setup import setup_theme

SLUG_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
IDENTIFIER_PATTERN = re.compile(r"^jwsoft-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")


def _replace_tokens(root: Path, values: dict[str, str]) -> None:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for token, value in values.items():
            content = content.replace(token, value)
        path.write_text(content, encoding="utf-8")


def init_theme(
    repository: Path,
    *,
    category: str,
    slug: str,
    identifier: str,
    name: str,
    features: list[str],
    install_packages: bool = True,
) -> Path:
    if not SLUG_PATTERN.fullmatch(category) or not SLUG_PATTERN.fullmatch(slug):
        raise HarnessError("category와 slug는 소문자 kebab-case여야 합니다.")
    if not IDENTIFIER_PATTERN.fullmatch(identifier):
        raise HarnessError("identifier는 jwsoft-로 시작하는 소문자 kebab-case여야 합니다.")
    target = repository / "themes" / category / slug
    if target.exists():
        raise HarnessError(f"대상 테마가 이미 존재합니다: {target}")

    source = repository / "templates" / "theme-scaffold"
    if not source.is_dir():
        raise HarnessError("테마 scaffold가 없습니다.")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target)
    try:
        _replace_tokens(
            target,
            {
                "__THEME_IDENTIFIER__": identifier,
                "__THEME_SLUG__": slug,
                "__THEME_PACKAGE__": slug.replace("jw-", ""),
                "__THEME_NAME__": name,
                "__FEATURES__": ", ".join(f'"{feature}"' for feature in features),
            },
        )
        context = load_context(target, repository=repository)
        setup_theme(context, install_packages=install_packages)
    except Exception:
        shutil.rmtree(target)
        raise
    return target
