"""Resolve a shared relay endpoint by name for plugin clients."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from ..llm.endpoint_manager import EndpointManager
from ..llm.types import EndpointConfig


class RelayNotFound(KeyError):
    def __init__(self, name: str, *, available: Sequence[str] = ()):
        super().__init__(name)
        self.name = name
        self.available = list(available)

    def __str__(self) -> str:
        return (
            f"relay endpoint {self.name!r} not found"
            + (f" (available: {', '.join(self.available)})" if self.available else "")
        )


@dataclass(frozen=True)
class RelayReference:
    name: str
    base_url: str
    api_key: str
    capabilities: list[str] = field(default_factory=list)
    supported_models: list[str] = field(default_factory=list)
    models_synced_at: float | None = None
    note: str | None = None
    extra: dict = field(default_factory=dict)

    def has_capability(self, cap: str) -> bool:
        cap_l = (cap or "").strip().lower()
        return any(c.strip().lower() == cap_l for c in self.capabilities)

    def supports_model(self, model: str) -> bool:
        if not model:
            return True
        if not self.supported_models:
            return True
        target = model.strip().lower()
        return any((m or "").strip().lower() == target for m in self.supported_models)


def _resolve_workspace(workspace_dir: str | os.PathLike | None) -> Path:
    if workspace_dir:
        return Path(workspace_dir)
    for key in ("SYNAPSE_WORKSPACE", "OPENAKITA_WORKSPACE"):
        env_ws = os.environ.get(key, "").strip()
        if env_ws:
            return Path(env_ws)
    return Path.cwd()


def _build_reference(cfg: EndpointConfig) -> RelayReference:
    api_key = cfg.get_api_key() or ""
    extra = dict(cfg.extra_params or {})
    return RelayReference(
        name=cfg.name,
        base_url=cfg.base_url,
        api_key=api_key,
        capabilities=list(cfg.capabilities or []),
        supported_models=list(cfg.supported_models or []),
        models_synced_at=cfg.models_synced_at,
        note=cfg.note,
        extra=extra,
    )


def list_relay_endpoints(
    workspace_dir: str | os.PathLike | None = None,
    *,
    required_capability: str | None = None,
    enabled_only: bool = True,
) -> list[RelayReference]:
    ws = _resolve_workspace(workspace_dir)
    mgr = EndpointManager(ws)
    out: list[RelayReference] = []
    for raw in mgr.list_endpoints("relay_endpoints"):
        if enabled_only and raw.get("enabled", True) is False:
            continue
        try:
            cfg = EndpointConfig.from_dict(raw)
        except Exception:
            continue
        ref = _build_reference(cfg)
        if required_capability and not ref.has_capability(required_capability):
            continue
        out.append(ref)
    return out


def resolve_relay_endpoint(
    name: str,
    workspace_dir: str | os.PathLike | None = None,
    *,
    required_capability: str | None = None,
) -> RelayReference:
    refs = list_relay_endpoints(
        workspace_dir,
        required_capability=required_capability,
        enabled_only=True,
    )
    name_l = (name or "").strip().lower()
    for ref in refs:
        if ref.name.strip().lower() == name_l:
            return ref
    raise RelayNotFound(
        name,
        available=[r.name for r in refs],
    )
