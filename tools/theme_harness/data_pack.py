from __future__ import annotations

import hashlib
import json
import re
import zipfile
from contextlib import AbstractContextManager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import HarnessError
from .model import Context


@dataclass(frozen=True)
class DataPackReport:
    pack_id: str
    pages: int
    boards: int
    posts: int
    media: int
    menus: int


class _PackSource(AbstractContextManager["_PackSource"]):
    def __init__(self, path: Path) -> None:
        self.path = path.resolve()
        self.archive: zipfile.ZipFile | None = None
        if self.path.is_file():
            try:
                self.archive = zipfile.ZipFile(self.path)
            except (OSError, zipfile.BadZipFile) as exc:
                raise HarnessError(f"레이아웃 데이터 팩 ZIP을 읽을 수 없습니다: {self.path}") from exc
        elif not self.path.is_dir():
            raise HarnessError(f"레이아웃 데이터 팩 경로가 없습니다: {self.path}")

    def __exit__(self, *_: object) -> None:
        if self.archive is not None:
            self.archive.close()

    def read_bytes(self, name: str) -> bytes:
        normalized = Path(name).as_posix().lstrip("/")
        try:
            if self.archive is not None:
                return self.archive.read(normalized)
            return (self.path / normalized).read_bytes()
        except (KeyError, OSError) as exc:
            raise HarnessError(f"레이아웃 데이터 팩 파일을 읽을 수 없습니다: {normalized}") from exc

    def exists(self, name: str) -> bool:
        normalized = Path(name).as_posix().lstrip("/")
        if self.archive is not None:
            return normalized in self.archive.namelist()
        return (self.path / normalized).is_file()

    def json(self, name: str, expected: type) -> Any:
        try:
            value = json.loads(self.read_bytes(name))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise HarnessError(f"레이아웃 데이터 팩 JSON을 읽을 수 없습니다: {name}") from exc
        if not isinstance(value, expected):
            label = "객체" if expected is dict else "배열"
            raise HarnessError(f"{name} 최상위 값은 {label}이어야 합니다.")
        return value


def _objects(items: list[Any], source: str, issues: list[str]) -> list[dict[str, Any]]:
    if not all(isinstance(item, dict) for item in items):
        issues.append(f"{source} 항목은 모두 객체여야 합니다.")
    return [item for item in items if isinstance(item, dict)]


def _keyed(items: list[dict[str, Any]], source: str, issues: list[str]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in items:
        key = item.get("key")
        if not isinstance(key, str) or not key:
            issues.append(f"{source}에 key가 없는 항목이 있습니다.")
            continue
        if key in result:
            issues.append(f"{source} key가 중복됐습니다: {key}")
            continue
        result[key] = item
    return result


def _destination(destination: Any) -> tuple[str, str]:
    if not isinstance(destination, dict):
        return ("", "")
    kind = destination.get("kind")
    ref = destination.get("ref")
    if kind == "page" and isinstance(ref, str):
        return (f"page:{ref}", "")
    if kind in {"board", "board_write"} and isinstance(ref, str):
        return (f"board:{ref}", "write" if kind == "board_write" else "")
    return ("", "")


def _expected_menu_paths(nodes: Any, parent: tuple[str, ...] = ()) -> set[tuple[tuple[str, ...], str, str, str]]:
    expected: set[tuple[tuple[str, ...], str, str, str]] = set()
    if not isinstance(nodes, list):
        return expected
    for node in nodes:
        if not isinstance(node, dict):
            continue
        labels = node.get("label")
        label = labels.get("ko") if isinstance(labels, dict) else None
        if not isinstance(label, str):
            continue
        target, route = _destination(node.get("destination"))
        expected.add((parent, label, target, route))
        expected.update(_expected_menu_paths(node.get("children"), parent + (label,)))
    return expected


def _actual_menu_paths(
    menus: dict[str, dict[str, Any]], issues: list[str]
) -> dict[tuple[tuple[str, ...], str, str, str], dict[str, Any]]:
    paths: dict[tuple[tuple[str, ...], str, str, str], dict[str, Any]] = {}

    def parent_labels(item: dict[str, Any]) -> tuple[str, ...]:
        labels: list[str] = []
        seen: set[str] = set()
        parent_key = item.get("parent_key")
        while isinstance(parent_key, str):
            if parent_key in seen:
                issues.append(f"메뉴 부모 순환 참조가 있습니다: {item.get('key')}")
                break
            seen.add(parent_key)
            parent = menus.get(parent_key)
            if parent is None:
                issues.append(f"메뉴 부모를 찾을 수 없습니다: {parent_key}")
                break
            label = parent.get("label")
            if isinstance(label, str):
                labels.append(label)
            parent_key = parent.get("parent_key")
        return tuple(reversed(labels))

    for item in menus.values():
        label = item.get("label")
        target = item.get("target")
        if not isinstance(label, str) or not isinstance(target, dict):
            issues.append(f"메뉴 label 또는 target이 올바르지 않습니다: {item.get('key')}")
            continue
        target_key = target.get("key") if target.get("kind") == "entity" else ""
        route = target.get("route", "")
        paths[(parent_labels(item), label, str(target_key), str(route))] = item
    return paths


def _check_manifest(
    source: _PackSource,
    manifest: dict[str, Any],
    datasets: dict[str, list[dict[str, Any]]],
    issues: list[str],
) -> None:
    declared = manifest.get("files")
    if not isinstance(declared, list):
        issues.append("manifest.files가 배열이 아닙니다.")
        return
    entries = {
        item.get("path"): item
        for item in declared
        if isinstance(item, dict) and isinstance(item.get("path"), str)
    }
    required = {
        "site.json", "profile.json", "menus.json", "pages.json", "boards.json",
        "posts.json", "categories.json", "products.json", "media.json", "LICENSE-CONTENT.md",
    }
    required.update(str(item.get("path")) for item in datasets["media"] if isinstance(item.get("path"), str))
    missing = sorted(required - entries.keys())
    if missing:
        issues.append("manifest.files 누락: " + ", ".join(missing))
    for path, entry in entries.items():
        if not isinstance(path, str) or not source.exists(path):
            issues.append(f"manifest 파일이 실제 팩에 없습니다: {path}")
            continue
        payload = source.read_bytes(path)
        if entry.get("bytes") != len(payload):
            issues.append(f"manifest bytes 불일치: {path}")
        if entry.get("sha256") != hashlib.sha256(payload).hexdigest():
            issues.append(f"manifest sha256 불일치: {path}")

    counts = manifest.get("counts")
    if not isinstance(counts, dict):
        issues.append("manifest.counts가 객체가 아닙니다.")
        return
    for name in ("menus", "pages", "boards", "posts", "categories", "products", "media"):
        actual = len(datasets[name])
        if counts.get(name) != actual:
            issues.append(f"manifest.counts.{name} 불일치: 선언 {counts.get(name)}, 실제 {actual}")


def verify_data_pack(context: Context, pack_path: str | Path) -> DataPackReport:
    contract_manifest = context.theme / "layout-data.json"
    if not contract_manifest.is_file():
        raise HarnessError(f"테마에 layout-data.json이 없습니다: {context.identifier}")
    layout_contract = json.loads(contract_manifest.read_text(encoding="utf-8"))
    if not isinstance(layout_contract, dict):
        raise HarnessError("layout-data.json 최상위 값은 객체여야 합니다.")
    structure_path = layout_contract.get("site_structure_contract")
    if not isinstance(structure_path, str):
        raise HarnessError("layout-data.json에 site_structure_contract가 없습니다.")
    structure = json.loads((context.theme / structure_path).read_text(encoding="utf-8"))
    if not isinstance(structure, dict):
        raise HarnessError("사이트 구조 계약 최상위 값은 객체여야 합니다.")

    issues: list[str] = []
    with _PackSource(Path(pack_path)) as source:
        manifest = source.json("manifest.json", dict)
        profile = source.json("profile.json", dict)
        datasets = {
            name: _objects(source.json(f"{name}.json", list), f"{name}.json", issues)
            for name in ("menus", "pages", "boards", "posts", "categories", "products", "media")
        }
        pages = _keyed(datasets["pages"], "pages.json", issues)
        boards = _keyed(datasets["boards"], "boards.json", issues)
        posts = _keyed(datasets["posts"], "posts.json", issues)
        media = _keyed(datasets["media"], "media.json", issues)
        menus = _keyed(datasets["menus"], "menus.json", issues)

        if profile.get("theme_identifier") != context.identifier:
            issues.append(
                f"profile.theme_identifier 불일치: {profile.get('theme_identifier')} != {context.identifier}"
            )
        if manifest.get("pack_id") != profile.get("key"):
            issues.append(f"manifest.pack_id와 profile.key가 다릅니다: {manifest.get('pack_id')} != {profile.get('key')}")

        expected_pages = {
            f"page:{item['key']}": item
            for item in structure.get("pages", [])
            if isinstance(item, dict) and isinstance(item.get("key"), str)
        }
        expected_boards = {
            f"board:{item['key']}": item
            for item in structure.get("boards", [])
            if isinstance(item, dict) and isinstance(item.get("key"), str)
        }
        for key, expected in expected_pages.items():
            actual = pages.get(key)
            if actual is None:
                issues.append(f"테마 필수 페이지 누락: {key}")
            elif actual.get("slug") != expected.get("slug"):
                issues.append(f"페이지 slug 불일치: {key}")
        for key, expected in expected_boards.items():
            actual = boards.get(key)
            if actual is None:
                issues.append(f"테마 필수 게시판 누락: {key}")
                continue
            if actual.get("slug") != expected.get("slug"):
                issues.append(f"게시판 slug 불일치: {key}")
            actual_settings = actual.get("settings") if isinstance(actual.get("settings"), dict) else {}
            expected_settings = expected.get("settings") if isinstance(expected.get("settings"), dict) else {}
            for setting, value in expected_settings.items():
                if actual_settings.get(setting) != value:
                    issues.append(f"게시판 설정 불일치: {key}.{setting}")
            count = sum(1 for post in posts.values() if post.get("board_key") == key)
            minimum = expected.get("minimumDemoPosts", 0)
            if isinstance(minimum, int) and count < minimum:
                issues.append(f"게시판 게시물 부족: {key} {count}/{minimum}")

        expected_navigation = _expected_menu_paths(structure.get("navigation"))
        actual_navigation = _actual_menu_paths(menus, issues)
        for parent, label, target, route in sorted(expected_navigation - actual_navigation.keys()):
            path = "/".join((*parent, label))
            issues.append(f"테마 메뉴 누락: {path} -> {target}{('/' + route) if route else ''}")
        for signature in sorted(expected_navigation & actual_navigation.keys()):
            placements = actual_navigation[signature].get("placements")
            if not isinstance(placements, list) or not {"desktop", "mobile"}.issubset(placements):
                path = "/".join((*signature[0], signature[1]))
                issues.append(f"PC·모바일 공용 메뉴 배치 누락: {path}")
        expected_footer = {
            (item.get("label", {}).get("ko"), *_destination(item.get("destination")))
            for item in structure.get("footerNavigation", [])
            if isinstance(item, dict) and isinstance(item.get("label"), dict)
        }
        actual_footer = {
            (item.get("label"), str(item.get("target", {}).get("key", "")), str(item.get("target", {}).get("route", "")))
            for item in menus.values()
            if isinstance(item.get("target"), dict)
            and isinstance(item.get("placements"), list)
            and "footer" in item["placements"]
        }
        for label, target, route in sorted(expected_footer - actual_footer):
            issues.append(f"푸터 메뉴 누락: {label} -> {target}{('/' + route) if route else ''}")

        known = set(pages) | set(boards) | set(posts) | set(media) | set(menus)
        for post in posts.values():
            if post.get("board_key") not in boards:
                issues.append(f"게시물의 게시판 참조를 찾을 수 없습니다: {post.get('key')} -> {post.get('board_key')}")
        for item in [*pages.values(), *posts.values()]:
            attachment_keys = item.get("attachment_keys", [])
            if isinstance(attachment_keys, list):
                for media_key in attachment_keys:
                    if media_key not in media:
                        issues.append(f"첨부 이미지 참조를 찾을 수 없습니다: {item.get('key')} -> {media_key}")
            content_refs = item.get("content_refs", [])
            declared_refs: set[str] = set()
            if isinstance(content_refs, list):
                for reference in content_refs:
                    if not isinstance(reference, dict):
                        issues.append(f"content_refs 항목이 객체가 아닙니다: {item.get('key')}")
                        continue
                    ref_key = reference.get("ref_key")
                    if isinstance(ref_key, str):
                        declared_refs.add(ref_key)
                    if reference.get("key") not in known:
                        issues.append(
                            f"본문 논리 참조를 찾을 수 없습니다: {item.get('key')} -> {reference.get('key')}"
                        )
            content = item.get("content")
            if isinstance(content, str):
                used_refs = set(re.findall(r"\[\[ref:([^\]]+)\]\]", content))
                for ref_key in sorted(used_refs - declared_refs):
                    issues.append(f"본문 참조 선언 누락: {item.get('key')} -> {ref_key}")
                for ref_key in sorted(declared_refs - used_refs):
                    issues.append(f"사용되지 않은 본문 참조 선언: {item.get('key')} -> {ref_key}")
        for item in media.values():
            path = item.get("path")
            if not isinstance(path, str) or not source.exists(path):
                issues.append(f"이미지 파일을 찾을 수 없습니다: {item.get('key')} -> {path}")
                continue
            payload = source.read_bytes(path)
            if item.get("bytes") != len(payload):
                issues.append(f"media bytes 불일치: {item.get('key')}")
            if item.get("sha256") != hashlib.sha256(payload).hexdigest():
                issues.append(f"media sha256 불일치: {item.get('key')}")

        features = structure.get("features")
        if isinstance(features, dict) and features.get("shopping") is False:
            if datasets["categories"] or datasets["products"]:
                issues.append("쇼핑 비포함 테마 팩에 categories 또는 products 데이터가 있습니다.")
        slots = profile.get("slots")
        if not isinstance(slots, dict):
            issues.append("profile.slots가 객체가 아닙니다.")
        else:
            for slot in layout_contract.get("slots", []):
                if not isinstance(slot, dict) or not isinstance(slot.get("key"), str):
                    continue
                key = slot["key"]
                values = slots.get(key)
                if not isinstance(values, list) or not values:
                    issues.append(f"테마 슬롯 연결 누락: {key}")
                    continue
                allowed = {str(value) for value in slot.get("reference_types", [])}
                for value in values:
                    if not isinstance(value, str) or value not in known:
                        issues.append(f"테마 슬롯 참조를 찾을 수 없습니다: {key} -> {value}")
                    elif value.split(":", 1)[0] not in allowed:
                        issues.append(f"테마 슬롯 참조 유형이 허용되지 않습니다: {key} -> {value}")

        _check_manifest(source, manifest, datasets, issues)

        if issues:
            detail = "\n".join(f"- {issue}" for issue in issues)
            raise HarnessError(f"레이아웃 데이터 팩 연결 검사 실패 ({len(issues)}건)\n{detail}")

        return DataPackReport(
            pack_id=str(manifest.get("pack_id", "")),
            pages=len(pages),
            boards=len(boards),
            posts=len(posts),
            media=len(media),
            menus=len(menus),
        )
