from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import HarnessError
from .io import read_json


@dataclass(frozen=True)
class Context:
    repository: Path
    theme: Path
    stack: dict[str, Any]
    config: dict[str, Any]

    @property
    def identifier(self) -> str:
        return str(self.config["themeIdentifier"])

    @property
    def version(self) -> str:
        return str(self.config["themeVersion"])

    @property
    def features(self) -> list[str]:
        return [str(item) for item in self.config["features"]]


def repository_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_context(theme_arg: str | Path, *, repository: Path | None = None) -> Context:
    repository = (repository or repository_root()).resolve()
    theme = Path(theme_arg)
    if not theme.is_absolute():
        theme = repository / theme
    try:
        theme = theme.resolve(strict=True)
        theme.relative_to((repository / "themes").resolve())
    except (OSError, ValueError) as exc:
        raise HarnessError(f"테마 경로는 themes 아래에 있어야 합니다: {theme_arg}") from exc

    stack = read_json(repository / "theme-stack.json")
    config = read_json(theme / "theme.harness.json")
    validate_context_data(stack, config)
    return Context(repository, theme, stack, config)


def validate_context_data(stack: dict[str, Any], config: dict[str, Any]) -> None:
    if stack.get("schemaVersion") != "1.0.0":
        raise HarnessError("지원하지 않는 theme-stack schemaVersion입니다.")
    if config.get("schemaVersion") != "1.0.0":
        raise HarnessError("지원하지 않는 theme.harness schemaVersion입니다.")
    if config.get("stackVersion") != stack.get("stackVersion"):
        raise HarnessError("테마의 stackVersion이 중앙 스택과 다릅니다.")
    identifier = config.get("themeIdentifier")
    if not isinstance(identifier, str) or not identifier.startswith("jwsoft-"):
        raise HarnessError("themeIdentifier는 jwsoft- 접두사를 사용해야 합니다.")
    if not isinstance(config.get("themeVersion"), str):
        raise HarnessError("themeVersion이 필요합니다.")
    features = config.get("features")
    if not isinstance(features, list) or not all(isinstance(x, str) for x in features):
        raise HarnessError("features는 문자열 배열이어야 합니다.")
    if len(features) != len(set(features)):
        raise HarnessError("features에 중복 값이 있습니다.")
    if "tailwind" not in features:
        raise HarnessError("모든 테마는 tailwind 기능을 포함해야 합니다.")

    definitions = stack.get("features")
    if not isinstance(definitions, dict):
        raise HarnessError("중앙 스택의 features가 올바르지 않습니다.")
    for feature in features:
        definition = definitions.get(feature)
        if not isinstance(definition, dict):
            raise HarnessError(f"허용되지 않은 기능입니다: {feature}")
        if definition.get("status") != "approved":
            raise HarnessError(f"실증 전 기능은 사용할 수 없습니다: {feature}")
        required = definition.get("requires", [])
        if any(item not in features for item in required):
            raise HarnessError(f"{feature}에 필요한 기능이 없습니다: {required}")


def expected_packages(context: Context) -> tuple[dict[str, str], dict[str, str]]:
    dependencies: dict[str, str] = {}
    dev_dependencies = {
        str(name): str(version)
        for name, version in context.stack["baseDevDependencies"].items()
    }
    for feature in context.features:
        definition = context.stack["features"][feature]
        dependencies.update(definition.get("dependencies", {}))
        dev_dependencies.update(definition.get("devDependencies", {}))
    return dependencies, dev_dependencies
