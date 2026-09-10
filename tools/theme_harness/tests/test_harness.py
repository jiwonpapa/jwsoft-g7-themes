from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools.theme_harness.checks import _check_seo_config, _check_shell_policy
from tools.theme_harness.data_pack import verify_data_pack
from tools.theme_harness.errors import HarnessError
from tools.theme_harness.io import read_json, write_json
from tools.theme_harness.model import load_context
from tools.theme_harness.package import write_package
from tools.theme_harness.scaffold import init_theme


class HarnessTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="jw-theme-harness-test-")
        self.repository = Path(self.temporary.name)
        source_repository = Path(__file__).resolve().parents[3]
        shutil.copy2(source_repository / "theme-stack.json", self.repository / "theme-stack.json")
        scaffold = self.repository / "templates" / "theme-scaffold"
        scaffold.parent.mkdir(parents=True)
        shutil.copytree(source_repository / "templates" / "theme-scaffold", scaffold)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def create_theme(self, features: list[str] | None = None) -> Path:
        return init_theme(
            self.repository,
            category="business",
            slug="jw-example-01",
            identifier="jwsoft-example01",
            name="JW EXAMPLE 01",
            features=features or ["tailwind"],
            install_packages=False,
        )

    def test_init_writes_exact_stack_configuration_without_shell(self) -> None:
        theme = self.create_theme()
        package = read_json(theme / "package.json")
        stack = read_json(self.repository / "theme-stack.json")
        self.assertEqual(package["scripts"], stack["requiredScripts"])
        self.assertEqual(package["packageManager"], "npm@11.19.0")
        self.assertEqual(package["devDependencies"]["tailwindcss"], "4.1.16")
        self.assertEqual(package["devDependencies"]["react"], "19.2.0")
        self.assertFalse(any(theme.rglob("*.sh")))

    def test_unproved_feature_is_rejected(self) -> None:
        with self.assertRaisesRegex(HarnessError, "실증 전 기능"):
            self.create_theme(["tailwind", "interactive-ui"])
        self.assertFalse((self.repository / "themes" / "business" / "jw-example-01").exists())

    def test_tailwind_base_feature_is_required(self) -> None:
        with self.assertRaisesRegex(HarnessError, "tailwind 기능"):
            self.create_theme(["icons"])

    def test_shell_business_logic_is_rejected(self) -> None:
        script = self.repository / "tools" / "bad.sh"
        script.parent.mkdir(parents=True)
        script.write_text("#!/bin/sh\nif true; then\n  echo bad\nfi\n", encoding="utf-8")
        issues: list[str] = []
        _check_shell_policy(self.repository, issues)
        self.assertEqual(len(issues), 1)
        self.assertIn("단일 exec 명령", issues[0])

    def test_seo_enabled_layout_requires_semantic_component_mapping(self) -> None:
        theme = self.create_theme()
        layout_path = theme / "layouts" / "home.json"
        layout = read_json(layout_path)
        layout["meta"] = {"seo": {"enabled": True}}
        write_json(layout_path, layout)
        context = load_context(theme, repository=self.repository)

        missing_config: list[str] = []
        _check_seo_config(context, missing_config)
        self.assertIn("seo-config.json", missing_config[0])

        write_json(theme / "seo-config.json", {"component_map": {"Div": {"tag": "div"}}})
        missing_component: list[str] = []
        _check_seo_config(context, missing_component)
        self.assertIn("H1", missing_component[0])

        write_json(
            theme / "seo-config.json",
            {"component_map": {"Div": {"tag": "div"}, "H1": {"tag": "h1"}}},
        )
        complete: list[str] = []
        _check_seo_config(context, complete)
        self.assertEqual(complete, [])

    def test_package_is_deterministic_and_excludes_development_files(self) -> None:
        theme = self.create_theme()
        write_json(
            theme / "package-lock.json",
            {"lockfileVersion": 3, "packages": {}},
        )
        (theme / "dist" / "js").mkdir(parents=True)
        (theme / "dist" / "css").mkdir(parents=True)
        (theme / "dist" / "js" / "components.iife.js").write_text("(()=>{})();\n")
        (theme / "dist" / "css" / "components.css").write_text("#jw-site{}\n")
        (theme / "THIRD-PARTY-NOTICES.md").write_text("# 제3자 고지\n")
        context = load_context(theme, repository=self.repository)
        output = self.repository / "output"
        first = write_package(context, output)
        first_hash = hashlib.sha256(first.read_bytes()).hexdigest()
        second = write_package(context, output)
        self.assertEqual(first_hash, hashlib.sha256(second.read_bytes()).hexdigest())
        with zipfile.ZipFile(second) as archive:
            names = set(archive.namelist())
        self.assertIn("JW-THEME-MANIFEST.json", names)
        self.assertIn("dist/js/components.iife.js", names)
        self.assertNotIn("src/index.ts", names)
        self.assertNotIn("package.json", names)

    def test_data_pack_verifier_matches_theme_structure_and_pack_manifest(self) -> None:
        theme = self.create_theme()
        write_json(
            theme / "layout-data.json",
            {
                "site_structure_contract": "contracts/site-structure.json",
                "slots": [
                    {
                        "key": "primary_navigation",
                        "reference_types": ["menu"],
                    }
                ],
            },
        )
        write_json(
            theme / "contracts" / "site-structure.json",
            {
                "features": {"shopping": False},
                "pages": [{"key": "company", "slug": "company"}],
                "boards": [
                    {
                        "key": "cases",
                        "slug": "cases",
                        "minimumDemoPosts": 1,
                        "settings": {"per_page": 5, "per_page_mobile": 5},
                    }
                ],
                "navigation": [
                    {
                        "label": {"ko": "회사소개"},
                        "destination": {"kind": "page", "ref": "company"},
                    }
                ],
                "footerNavigation": [
                    {
                        "label": {"ko": "회사소개"},
                        "destination": {"kind": "page", "ref": "company"},
                    }
                ],
            },
        )
        pack = self.repository / "data-pack"
        pack.mkdir()

        def write_value(name: str, value: object) -> None:
            (pack / name).write_text(
                json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )

        values = {
            "site.json": {"name": "Example"},
            "profile.json": {
                "key": "example",
                "theme_identifier": "jwsoft-example01",
                "slots": {"primary_navigation": ["menu:company"]},
            },
            "menus.json": [
                {
                    "key": "menu:company",
                    "label": "회사소개",
                    "parent_key": None,
                    "target": {"kind": "entity", "key": "page:company"},
                    "placements": ["desktop", "mobile", "footer"],
                }
            ],
            "pages.json": [{"key": "page:company", "slug": "company"}],
            "boards.json": [
                {
                    "key": "board:cases",
                    "slug": "cases",
                    "settings": {"per_page": 5, "per_page_mobile": 5},
                }
            ],
            "posts.json": [{"key": "post:case", "board_key": "board:cases"}],
            "categories.json": [],
            "products.json": [],
            "media.json": [],
        }
        for name, value in values.items():
            write_value(name, value)
        (pack / "LICENSE-CONTENT.md").write_text("# Content license\n", encoding="utf-8")

        files = []
        for name in [*values, "LICENSE-CONTENT.md"]:
            payload = (pack / name).read_bytes()
            files.append(
                {
                    "path": name,
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                }
            )
        write_value(
            "manifest.json",
            {
                "pack_id": "example",
                "files": files,
                "counts": {
                    "menus": 1,
                    "pages": 1,
                    "boards": 1,
                    "posts": 1,
                    "categories": 0,
                    "products": 0,
                    "media": 0,
                },
            },
        )
        context = load_context(theme, repository=self.repository)
        report = verify_data_pack(context, pack)
        self.assertEqual((report.pages, report.boards, report.posts, report.menus), (1, 1, 1, 1))

        archive_path = self.repository / "data-pack.zip"
        with zipfile.ZipFile(archive_path, "w") as archive:
            for path in sorted(pack.iterdir()):
                archive.write(path, path.name)
        archive_report = verify_data_pack(context, archive_path)
        self.assertEqual(archive_report.pack_id, "example")

        write_value("pages.json", [])
        with self.assertRaisesRegex(HarnessError, "테마 필수 페이지 누락"):
            verify_data_pack(context, pack)


if __name__ == "__main__":
    unittest.main()
