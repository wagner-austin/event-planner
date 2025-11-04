from __future__ import annotations

import ast
import sys
from collections.abc import Iterable
from pathlib import Path

FORBIDDEN_IMPORTS = {"Any", "cast"}


def iter_python_files(roots: Iterable[str]) -> Iterable[Path]:
    for root in roots:
        base = Path(root)
        if not base.exists():
            continue
        yield from base.rglob("*.py")


def check_path(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8")
        tree = ast.parse(text, filename=str(path))
    except Exception as exc:  # pragma: no cover - guard must not crash
        return [f"{path}: PARSE_ERROR {exc}"]

    # Detect forbidden typing imports and usage
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "typing":
            errors.extend(
                [
                    f"{path}:{node.lineno} forbidden typing import '{alias.name}'"
                    for alias in node.names
                    if alias.name in FORBIDDEN_IMPORTS
                ]
            )
        # typing.Any and typing.cast attribute usage like typing.Any / typing.cast
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.value, ast.Name)
            and node.value.id == "typing"
            and node.attr in FORBIDDEN_IMPORTS
        ):
            errors.append(
                f"{path}:{node.lineno} forbidden use of typing.{node.attr}()"
            )
        # bare cast(...) call
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "cast"
        ):
            errors.append(f"{path}:{node.lineno} forbidden use of cast()")
        # annotations that reference Any by name
        if isinstance(node, ast.Name) and node.id == "Any":
            errors.append(f"{path}:{node.lineno} forbidden type 'Any'")

    # Find inline comment ignores
    for i, line in enumerate(text.splitlines(), start=1):
        if "# type: ignore" in line:
            errors.append(f"{path}:{i} forbidden 'type: ignore'")

    return errors


def run(roots: list[str]) -> int:
    all_errors: list[str] = []
    for p in iter_python_files(roots):
        all_errors.extend(check_path(p))
    if all_errors:
        print("\n".join(all_errors))
        return 1
    return 0


def main() -> int:
    return run(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
