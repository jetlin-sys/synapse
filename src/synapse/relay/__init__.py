"""Shared relay-station registry for plugin clients."""

from .resolver import (
    RelayNotFound,
    RelayReference,
    list_relay_endpoints,
    resolve_relay_endpoint,
)
from .settings_helper import (
    SettingsRelayResolutionError,
    apply_relay_override,
)

__all__ = [
    "RelayNotFound",
    "RelayReference",
    "SettingsRelayResolutionError",
    "apply_relay_override",
    "list_relay_endpoints",
    "resolve_relay_endpoint",
]
