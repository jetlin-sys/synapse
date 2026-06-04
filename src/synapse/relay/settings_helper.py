"""Plugin-side helper for relay override settings."""

from __future__ import annotations

import logging
from typing import Any

from .resolver import RelayNotFound, RelayReference, resolve_relay_endpoint

logger = logging.getLogger(__name__)


class SettingsRelayResolutionError(Exception):
    def __init__(self, message: str, *, user_message: str | None = None):
        super().__init__(message)
        self.user_message = user_message or message


def apply_relay_override(
    settings: dict[str, Any],
    *,
    default_base_url: str = "",
    required_capability: str = "",
    plugin_name: str = "plugin",
) -> dict[str, Any]:
    if not isinstance(settings, dict):
        raise TypeError("settings must be a dict")

    out = dict(settings)
    relay_name = str(out.pop("relay_endpoint", "") or "").strip()
    policy = str(out.pop("relay_fallback_policy", "") or "official")
    if not relay_name:
        return out

    try:
        ref = resolve_relay_endpoint(
            relay_name,
            required_capability=required_capability or None,
        )
    except RelayNotFound as exc:
        if policy == "strict":
            available = ", ".join(exc.available) if exc.available else "（空）"
            user_msg = (
                f"中转站 {relay_name!r} 未找到或不支持所需能力 "
                f"({required_capability or '任意'})。当前可用: {available}。"
                "请到 LLM 配置页检查 relay_endpoints。"
            )
            raise SettingsRelayResolutionError(
                f"relay {relay_name!r} not resolvable: {exc}",
                user_message=user_msg,
            ) from exc
        logger.warning(
            "%s: relay %r unresolvable (%s); falling back to per-plugin settings",
            plugin_name,
            relay_name,
            exc,
        )
        return out
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "%s: relay resolution failed for %r: %s; falling back",
            plugin_name,
            relay_name,
            exc,
        )
        return out

    if isinstance(ref, RelayReference):
        if ref.base_url:
            out["base_url"] = ref.base_url
        elif default_base_url and not out.get("base_url"):
            out["base_url"] = default_base_url
        if ref.api_key:
            out["api_key"] = ref.api_key
        out["_relay_reference"] = ref
    return out
