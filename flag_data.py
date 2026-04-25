"""Shared data loader for the desktop app.

The GitHub Pages version uses data.js directly. Parsing that file here keeps the
Tkinter app aligned with the deployed data without duplicating 197 countries in
two separate source files.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Any


DATA_JS = Path(__file__).with_name("data.js")


def _strip_js_comments(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    return re.sub(r"^\s*//.*?$", "", source, flags=re.MULTILINE)


def _extract_object(source: str, const_name: str) -> dict[str, Any]:
    pattern = rf"const\s+{re.escape(const_name)}\s*=\s*(\{{.*?\}});"
    match = re.search(pattern, source, flags=re.DOTALL)
    if not match:
        raise RuntimeError(f"Could not find {const_name} in {DATA_JS.name}")
    return ast.literal_eval(match.group(1))


def _load() -> tuple[
    dict[str, str],
    dict[str, str],
    dict[str, str],
    dict[str, list[str]],
    dict[str, list[str]],
]:
    source = _strip_js_comments(DATA_JS.read_text(encoding="utf-8"))
    return (
        _extract_object(source, "countryContinent"),
        _extract_object(source, "countryCapitals"),
        _extract_object(source, "alpha2Overrides"),
        _extract_object(source, "countryAliases"),
        _extract_object(source, "capitalAliases"),
    )


COUNTRY_CONTINENTS, COUNTRY_CAPITALS, FLAG_CODES, COUNTRY_ALIASES, CAPITAL_ALIASES = _load()
COUNTRIES = sorted(COUNTRY_CONTINENTS)
CONTINENTS = sorted(set(COUNTRY_CONTINENTS.values()))


def validate_data() -> None:
    missing_capitals = sorted(set(COUNTRY_CONTINENTS) - set(COUNTRY_CAPITALS))
    missing_codes = sorted(set(COUNTRY_CONTINENTS) - set(FLAG_CODES))
    if missing_capitals or missing_codes:
        details = []
        if missing_capitals:
            details.append(f"missing capitals: {', '.join(missing_capitals)}")
        if missing_codes:
            details.append(f"missing flag codes: {', '.join(missing_codes)}")
        raise RuntimeError("; ".join(details))
