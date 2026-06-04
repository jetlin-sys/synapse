"""Plugin version compatibility checking."""

from __future__ import annotations

import logging
import platform
import sys
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .manifest import PluginManifest

logger = logging.getLogger(__name__)

PLUGIN_API_VERSION = "2.0.0"
PLUGIN_UI_API_VERSION = "1.0.0"
PLUGIN_API_COMPAT_WINDOW: frozenset[int] = frozenset({1, 2})


@dataclass
class CompatResult:
    ok: bool = True
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def check_compatibility(manifest: PluginManifest) -> CompatResult:
    result = CompatResult()
    requires = manifest.requires
    if not requires:
        return result

    synapse_spec = requires.get("synapse", "") or requires.get("openakita", "")
    _check_synapse(manifest.id, synapse_spec, result)
    _check_plugin_api(manifest.id, requires.get("plugin_api", ""), result)
    _check_sdk(manifest.id, requires.get("sdk", ""), result)
    _check_python(manifest.id, requires.get("python", ""), result)

    if manifest.has_ui:
        _check_plugin_ui_api(manifest.id, requires.get("plugin_ui_api", ""), result)

    return result


def _parse_version(raw: str) -> tuple[int, ...] | None:
    raw = raw.strip().lstrip("v")
    if "," in raw:
        raw = raw.split(",", 1)[0].strip()
    parts = []
    for seg in raw.split("."):
        seg = seg.strip()
        digits = ""
        for ch in seg:
            if ch.isdigit():
                digits += ch
            else:
                break
        if not digits:
            return None
        parts.append(int(digits))
    return tuple(parts) if parts else None


def _get_system_version() -> tuple[int, ...]:
    try:
        from .. import __version__

        v = _parse_version(__version__)
        if v:
            return v
    except Exception:
        pass
    return (0, 0, 0)


def _check_synapse(plugin_id: str, spec: str, result: CompatResult) -> None:
    if not spec:
        return
    if not spec.startswith(">="):
        result.warnings.append(f"Unrecognised synapse spec '{spec}' (expected >=X.Y.Z)")
        return

    min_ver = _parse_version(spec[2:])
    if min_ver is None:
        result.warnings.append(f"Cannot parse synapse version in '{spec}'")
        return

    current = _get_system_version()
    if current < min_ver:
        msg = (
            f"Plugin '{plugin_id}' requires synapse {spec}, "
            f"current is {'.'.join(str(x) for x in current)}"
        )
        result.errors.append(msg)
        result.ok = False


def _check_plugin_api(plugin_id: str, spec: str, result: CompatResult) -> None:
    if not spec:
        return

    current = _parse_version(PLUGIN_API_VERSION)
    if current is None:
        return

    if spec.startswith("~"):
        req_major_str = spec[1:].strip()
        req_major = _parse_version(req_major_str)
        if req_major is None:
            result.warnings.append(f"Cannot parse plugin_api spec '{spec}'")
            return

        if req_major[0] == current[0]:
            if len(req_major) > 1 and len(current) > 1 and req_major[1] > current[1]:
                result.warnings.append(
                    f"Plugin '{plugin_id}' was built for API ~{req_major_str}, "
                    f"current is {PLUGIN_API_VERSION} — some features may be missing"
                )
        elif req_major[0] in PLUGIN_API_COMPAT_WINDOW:
            result.warnings.append(
                f"Plugin '{plugin_id}' targets plugin_api ~{req_major_str} but host "
                f"is {PLUGIN_API_VERSION}; loaded under compatibility window "
                f"{sorted(PLUGIN_API_COMPAT_WINDOW)} — verify behaviour."
            )
        else:
            msg = (
                f"Plugin '{plugin_id}' requires plugin_api {spec} "
                f"(major {req_major[0]}), current API is {PLUGIN_API_VERSION} "
                f"(major {current[0]}); outside compatibility window "
                f"{sorted(PLUGIN_API_COMPAT_WINDOW)}"
            )
            result.errors.append(msg)
            result.ok = False
    elif spec.startswith(">="):
        req = _parse_version(spec[2:])
        if req is None:
            result.warnings.append(f"Cannot parse plugin_api spec '{spec}'")
            return
        if current < req:
            msg = (
                f"Plugin '{plugin_id}' requires plugin_api {spec}, current is {PLUGIN_API_VERSION}"
            )
            result.errors.append(msg)
            result.ok = False
    else:
        result.warnings.append(f"Unrecognised plugin_api spec '{spec}' (expected ~N or >=X.Y.Z)")


def _check_sdk(plugin_id: str, spec: str, result: CompatResult) -> None:
    if not spec:
        return
    min_part = spec.split(",", 1)[0].strip()
    if not min_part.startswith(">="):
        return
    req = _parse_version(min_part[2:])
    if req is None:
        return

    try:
        from synapse_plugin_sdk.version import SDK_VERSION

        sdk = _parse_version(SDK_VERSION)
    except ImportError:
        sdk = None

    if sdk is None:
        result.warnings.append(
            f"Plugin '{plugin_id}' recommends synapse-plugin-sdk {spec}, but it is not installed"
        )
    elif sdk < req:
        result.warnings.append(
            f"Plugin '{plugin_id}' recommends synapse-plugin-sdk {spec}, "
            f"installed is {'.'.join(str(x) for x in sdk)}"
        )


def _check_python(plugin_id: str, spec: str, result: CompatResult) -> None:
    if not spec or not spec.startswith(">="):
        return
    req = _parse_version(spec[2:])
    if req is None:
        return
    current = sys.version_info[:3]
    if current < req:
        msg = f"Plugin '{plugin_id}' requires Python {spec}, current is {platform.python_version()}"
        result.errors.append(msg)
        result.ok = False


def _check_plugin_ui_api(plugin_id: str, spec: str, result: CompatResult) -> None:
    if not spec:
        return

    current = _parse_version(PLUGIN_UI_API_VERSION)
    if current is None:
        return

    if spec.startswith("~"):
        req_major_str = spec[1:].strip()
        req_major = _parse_version(req_major_str)
        if req_major is None:
            result.warnings.append(f"Cannot parse plugin_ui_api spec '{spec}'")
            return
        if req_major[0] != current[0]:
            result.warnings.append(
                f"Plugin '{plugin_id}' requires plugin_ui_api {spec} "
                f"(major {req_major[0]}), current UI API is {PLUGIN_UI_API_VERSION} "
                f"(major {current[0]}) — UI may not work correctly"
            )
        elif len(req_major) > 1 and len(current) > 1 and req_major[1] > current[1]:
            result.warnings.append(
                f"Plugin '{plugin_id}' was built for UI API ~{req_major_str}, "
                f"current is {PLUGIN_UI_API_VERSION} — some UI features may be missing"
            )
    elif spec.startswith(">="):
        req = _parse_version(spec[2:])
        if req is None:
            result.warnings.append(f"Cannot parse plugin_ui_api spec '{spec}'")
            return
        if current < req:
            result.warnings.append(
                f"Plugin '{plugin_id}' requires plugin_ui_api {spec}, "
                f"current is {PLUGIN_UI_API_VERSION} — UI may not work correctly"
            )
    else:
        result.warnings.append(
            f"Unrecognised plugin_ui_api spec '{spec}' (expected ~N or >=X.Y.Z)"
        )
