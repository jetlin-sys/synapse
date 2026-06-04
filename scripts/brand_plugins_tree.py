#!/usr/bin/env python3
"""Apply Synapse branding to plugins/ after copying from upstream openakita.

Preserves Plugin 2.0 UI protocol globals (window.OpenAkita, openakita:* events).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / "plugins"

SKIP_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".venv",
    ".mypy_cache",
    ".ruff_cache",
}
SKIP_EXT = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".mp4",
    ".zip",
    ".exe",
    ".dll",
    ".pdf",
    ".wasm",
    ".min.js.map",
}

# Placeholders for UI bridge protocol (restored after generic replace).
_UI_PLACEHOLDERS = {
    "window.OpenAkita": "\x00OA_WIN\x00",
    "OpenAkitaI18n": "\x00OA_I18N\x00",
    "OpenAkitaIcons": "\x00OA_ICONS\x00",
    "openakita:ready": "\x00OA_EVT_READY\x00",
    "openakita:theme-change": "\x00OA_EVT_THEME\x00",
    "openakita:locale-change": "\x00OA_EVT_LOCALE\x00",
    "openakita:event": "\x00OA_EVT_EVENT\x00",
    "__akita_bridge": "\x00OA_BRIDGE\x00",
}


def _is_ui_dist(path: Path) -> bool:
    parts = path.parts
    return "ui" in parts and "dist" in parts


def transform_text(text: str, *, ui_dist: bool) -> str:
    if ui_dist:
        for orig, ph in _UI_PLACEHOLDERS.items():
            text = text.replace(orig, ph)

    text = text.replace("openakita_plugin_sdk", "synapse_plugin_sdk")
    text = text.replace("OPENAKITA_", "SYNAPSE_")
    text = text.replace("OpenAkita", "Synapse")
    text = re.sub(r"\bOPENAKITA\b", "SYNAPSE", text)
    text = text.replace("from openakita.", "from synapse.")
    text = text.replace("import openakita.", "import synapse.")
    # requires.openakita in plugin.json
    text = re.sub(
        r'("openakita"\s*:\s*)',
        r'"synapse": ',
        text,
    )
    text = text.replace("~/.openakita/", "~/.synapse/")
    text = text.replace("~/.openakita", "~/.synapse")
    text = text.replace("openakita", "synapse")

    if ui_dist:
        rev = {v: k for k, v in _UI_PLACEHOLDERS.items()}
        for ph, orig in rev.items():
            text = text.replace(ph, orig)

    return text


def main() -> None:
    if not PLUGINS.is_dir():
        raise SystemExit(f"plugins/ not found at {PLUGINS}")

    changed = 0
    for path in PLUGINS.rglob("*"):
        if path.is_dir():
            continue
        if any(p in SKIP_DIRS for p in path.parts):
            continue
        if path.suffix.lower() in SKIP_EXT:
            continue
        try:
            raw = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        ui_dist = _is_ui_dist(path)
        new = transform_text(raw, ui_dist=ui_dist)
        if new != raw:
            path.write_text(new, encoding="utf-8", newline="\n")
            changed += 1

    print(f"Branded {changed} files under {PLUGINS}")


if __name__ == "__main__":
    main()
