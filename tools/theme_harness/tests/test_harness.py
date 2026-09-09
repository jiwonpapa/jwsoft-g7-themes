from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools.theme_harness.checks import _check_shell_policy
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


if __name__ == "__main__":
    unittest.main()
