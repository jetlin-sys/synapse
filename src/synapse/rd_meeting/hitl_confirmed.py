"""节点级人工确认累积台账：``archive/<stage>/<node_id>/hitl_confirmed.md``。"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from synapse.rd_meeting.paths import archive_node_dir
from synapse.rd_sop.nodes import stage_id_for_node_id, stage_name_for_id

logger = logging.getLogger(__name__)

HITL_CONFIRMED_FILENAME = "hitl_confirmed.md"
_ROUND_HEADER_RE = re.compile(r"^##\s+第\s+\d+\s+轮", re.MULTILINE)


def resolve_stage_name_for_node(node_id: str, binding: dict[str, Any] | None = None) -> str:
    if isinstance(binding, dict):
        name = str(binding.get("stage_name") or "").strip()
        if name:
            return name
    nid = (node_id or "").strip()
    if not nid or nid == "pending":
        return ""
    return stage_name_for_id(stage_id_for_node_id(nid))


def hitl_confirmed_path(scope_id: str, stage_name: str, node_id: str) -> Path:
    return archive_node_dir(scope_id, stage_name, node_id) / HITL_CONFIRMED_FILENAME


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _count_rounds(text: str) -> int:
    return len(_ROUND_HEADER_RE.findall(text or ""))


def append_hitl_confirmed(
    scope_id: str,
    node_id: str,
    body: str,
    *,
    stage_name: str = "",
    binding: dict[str, Any] | None = None,
    intervention_kind: str = "interactive",
) -> Path | None:
    """追加一轮人工确认到节点归档 ``hitl_confirmed.md``。"""
    sid = (scope_id or "").strip()
    nid = (node_id or "").strip()
    content = (body or "").strip()
    if not sid or not nid or nid == "pending" or not content:
        return None

    stg = (stage_name or "").strip() or resolve_stage_name_for_node(nid, binding)
    if not stg:
        logger.debug("append_hitl_confirmed: missing stage_name scope=%s node=%s", sid, nid)
        return None

    path = hitl_confirmed_path(sid, stg, nid)
    path.parent.mkdir(parents=True, exist_ok=True)

    existing = ""
    if path.is_file():
        try:
            existing = path.read_text(encoding="utf-8").strip()
        except OSError as exc:
            logger.debug("read hitl_confirmed failed %s: %s", path, exc)

    round_n = _count_rounds(existing) + 1
    kind = (intervention_kind or "interactive").strip().lower() or "interactive"
    block = (
        f"## 第 {round_n} 轮 · {kind} · {_now_iso()}\n\n"
        f"{content}\n"
    )
    if existing:
        path.write_text(f"{existing}\n\n{block}".strip() + "\n", encoding="utf-8")
    else:
        header = (
            "# 本节点人工确认累积台账\n\n"
            "以下为用户在各轮 HITL 问卷中的确认与补充；"
            "后续轮次须继承已确认项，仅推进未决部分。\n\n"
        )
        path.write_text(f"{header}{block}".strip() + "\n", encoding="utf-8")
    return path


def read_hitl_confirmed(
    scope_id: str,
    node_id: str,
    *,
    stage_name: str = "",
    binding: dict[str, Any] | None = None,
) -> str:
    """读取节点 ``hitl_confirmed.md`` 全文（无文件则空串）。"""
    sid = (scope_id or "").strip()
    nid = (node_id or "").strip()
    if not sid or not nid or nid == "pending":
        return ""

    stg = (stage_name or "").strip() or resolve_stage_name_for_node(nid, binding)
    if not stg:
        return ""

    path = hitl_confirmed_path(sid, stg, nid)
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        logger.debug("read hitl_confirmed failed %s: %s", path, exc)
        return ""


def split_hitl_confirmed_rounds(text: str) -> tuple[str, str]:
    """拆分为 (先前各轮累积, 最新一轮)；仅一轮时累积为空。"""
    raw = (text or "").strip()
    if not raw:
        return "", ""

    matches = list(_ROUND_HEADER_RE.finditer(raw))
    if not matches:
        return "", raw
    if len(matches) == 1:
        return "", raw[matches[0].start() :].strip()

    last_start = matches[-1].start()
    prior = raw[:last_start].strip()
    latest = raw[last_start:].strip()
    return prior, latest


def format_hitl_confirmed_cumulative_prompt(
    scope_id: str,
    node_id: str,
    *,
    stage_name: str = "",
    binding: dict[str, Any] | None = None,
) -> str:
    """注入主控 prompt：先前各轮已确认内容（不含最新一轮，避免与 pending 重复）。"""
    full = read_hitl_confirmed(scope_id, node_id, stage_name=stage_name, binding=binding)
    prior, _ = split_hitl_confirmed_rounds(full)
    if not prior:
        return ""
    return f"## 本节点已确认的人工决策（累积）\n\n{prior}\n"
