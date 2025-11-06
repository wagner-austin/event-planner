from __future__ import annotations

import json
import re
from collections.abc import Iterable
from pathlib import Path
from typing import TypeGuard

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'

TS_FORBIDDEN = [
    (re.compile(r"\b:\s*any\b"), ": any is forbidden"),
    (re.compile(r"<\s*any\s*>"), "angle-bracket any assertion is forbidden"),
    (re.compile(r"@ts-ignore"), "@ts-ignore is forbidden"),
    (re.compile(r"@ts-expect-error"), "@ts-expect-error is forbidden"),
]

# Forbid TypeScript type assertions broadly: look for " as " outside import lines.

def scan_ts_file(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding='utf-8-sig')
    for i, line in enumerate(text.splitlines(), start=1):
        s = line.strip()
        if ' as ' in line and not s.startswith('import '):
            errors.append(f"{path}:{i} type assertion 'as' is forbidden")
        if s.startswith('export default'):
            errors.append(f"{path}:{i} default exports are forbidden")
        for rx, msg in TS_FORBIDDEN:
            if rx.search(line):
                errors.append(f"{path}:{i} {msg}")
    return errors


def iter_ts_files() -> Iterable[Path]:
    base = WEB / 'src'
    if base.exists():
        yield from base.rglob('*.ts')


def is_dict_str_obj(x: object) -> TypeGuard[dict[str, object]]:
    return isinstance(x, dict) and all(isinstance(k, str) for k in x)


def validate_tsconfig() -> list[str]:
    path = ROOT / 'tsconfig.json'
    errs: list[str] = []
    data_obj: object = json.loads(path.read_text(encoding='utf-8-sig'))
    if not is_dict_str_obj(data_obj):
        return [f"{path}: must be a JSON object"]
    co_obj: object | None = data_obj.get('compilerOptions')
    co: dict[str, object] = co_obj if (isinstance(co_obj, dict) and is_dict_str_obj(co_obj)) else {}
    req = {
        'strict': True,
        'noImplicitAny': True,
        'noUncheckedIndexedAccess': True,
        'exactOptionalPropertyTypes': True,
        'useUnknownInCatchVariables': True,
        'noImplicitOverride': True,
        'forceConsistentCasingInFileNames': True,
    }
    for k, v in req.items():
        if co.get(k) != v:
            errs.append(f"{path}: compilerOptions.{k} must be {v}")
    return errs


def validate_html() -> list[str]:
    errs: list[str] = []
    pages = [WEB / 'index.html']
    for p in pages:
        if not p.exists():
            errs.append(f"{p}: MISSING page")
            continue
        txt = p.read_text(encoding='utf-8')
        if 'Content-Security-Policy' not in txt:
            errs.append(f"{p}: missing CSP meta tag")
        for m in re.finditer(r"<script[^>]+src=\"([^\"]+)\"", txt):
            src = str(m.group(1))
            fp = WEB / src
            # Allow compiled assets under assets/js/ to be absent before build
            if src.startswith('assets/js/'):
                continue
            if not fp.exists():
                errs.append(f"{p}: script src not found: {src}")
    return errs


def validate_config() -> list[str]:
    path = WEB / 'config.json'
    errs: list[str] = []
    data_obj: object = json.loads(path.read_text(encoding='utf-8-sig'))
    if not is_dict_str_obj(data_obj):
        errs.append(f"{path}: must be object with non-empty string API_BASE_URL")
        return errs
    api = data_obj.get('API_BASE_URL')
    ok = isinstance(api, str) and bool(api)
    if not ok:
        errs.append(f"{path}: must be object with non-empty string API_BASE_URL")
    return errs


def main() -> int:
    errors: list[str] = []
    for f in iter_ts_files():
        errors.extend(scan_ts_file(f))
    errors.extend(validate_tsconfig())
    errors.extend(validate_html())
    errors.extend(validate_config())
    import sys
    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1
    sys.stdout.write('web_guard: ok\n')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
