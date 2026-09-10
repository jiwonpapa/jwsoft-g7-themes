from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .build import build_theme
from .checks import check_theme
from .data_pack import verify_data_pack
from .errors import HarnessError
from .model import load_context, repository_root
from .package import package_theme
from .scaffold import init_theme
from .setup import setup_theme


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jw-theme", description="JW SOFT G7 테마 제작 하네스")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init = subparsers.add_parser("init", help="새 테마 scaffold와 의존성을 준비합니다.")
    init.add_argument("--category", required=True)
    init.add_argument("--slug", required=True)
    init.add_argument("--identifier", required=True)
    init.add_argument("--name", required=True)
    init.add_argument("--features", default="tailwind")
    init.add_argument("--skip-install", action="store_true")

    for command in ("setup", "check", "build", "package"):
        item = subparsers.add_parser(command)
        item.add_argument("theme")
        if command == "setup":
            item.add_argument("--skip-install", action="store_true")
        if command == "check":
            item.add_argument("--release", action="store_true")
        if command == "package":
            item.add_argument("--output-dir", type=Path)
    data_pack = subparsers.add_parser(
        "verify-data-pack", help="테마 사이트 구조 계약과 레이아웃 데이터 팩을 대조합니다."
    )
    data_pack.add_argument("theme")
    data_pack.add_argument("pack", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "init":
            features = [item.strip() for item in args.features.split(",") if item.strip()]
            target = init_theme(
                repository_root(),
                category=args.category,
                slug=args.slug,
                identifier=args.identifier,
                name=args.name,
                features=features,
                install_packages=not args.skip_install,
            )
            print(f"생성 완료: {target}")
            return 0

        context = load_context(args.theme)
        if args.command == "setup":
            setup_theme(context, install_packages=not args.skip_install)
            print(f"설정 완료: {context.identifier}")
        elif args.command == "check":
            check_theme(context, release=args.release)
            print(f"검사 통과: {context.identifier}")
        elif args.command == "build":
            build_theme(context)
            print(f"빌드 통과: {context.identifier}")
        elif args.command == "package":
            destination = package_theme(context, args.output_dir)
            print(f"패키지 완료: {destination}")
        elif args.command == "verify-data-pack":
            report = verify_data_pack(context, args.pack)
            print(
                f"레이아웃 데이터 팩 연결 검사 통과: {report.pack_id} "
                f"(페이지 {report.pages}, 게시판 {report.boards}, 게시물 {report.posts}, "
                f"이미지 {report.media}, 메뉴 {report.menus})"
            )
        return 0
    except (HarnessError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
