"""研发会议室流程日志：``text`` 字段统一为可解析 JSON（便于排查）。"""

from __future__ import annotations

import json
from typing import Any

FLOW_LOG_PREFIX = "会议室流程日志"
FLOW_LOG_JSON_VERSION = "1.0"

# event → 流程阶段（UI / room_history 展示用）
EVENT_FLOW_STAGE: dict[str, str] = {
    "room_opened": "开启会议室",
    "node_init": "节点初始化",
    "node_started": "节点开始执行",
    "run_node_scheduled": "调度节点执行",
    "run_node_begin": "节点执行中",
    "prewarm_workers": "预热协作智能体",
    "host_llm_begin": "主控推理开始",
    "host_llm_end": "主控推理结束",
    "delegation_started": "委派协作",
    "delegation_finished": "协作反馈",
    "human_gate": "人工门控",
    "node_pending_clarify": "会中澄清",
    "node_pending_confirm": "结果确认",
    "node_validation_failed": "产物校验失败",
    "node_failed": "节点失败",
    "node_completed": "节点完成",
    "node_skipped": "节点跳过",
    "human_intervene": "人工介入",
    "hitl_approved": "确认通过",
    "hitl_rejected": "确认驳回",
    "hitl_dynamic": "动态问卷",
    "user_context": "用户上下文",
    "phase_change": "阶段切换",
    "pipeline_transition": "流程迁移",
    "system": "系统",
    "chat_message": "对话",
}

CHAT_VISIBLE_EVENTS = frozenset(
    {
        "chat_message",
        "human_intervene",
        "room_opened",
        "system",
        "node_started",
        "node_init",
        "run_node_scheduled",
        "run_node_begin",
        "prewarm_workers",
        "host_llm_begin",
        "host_llm_end",
        "human_gate",
        "delegation_started",
        "delegation_finished",
        "node_failed",
        "node_validation_failed",
        "hitl_approved",
        "hitl_rejected",
        "hitl_dynamic",
        "node_pending_confirm",
        "node_pending_clarify",
        "node_completed",
        "node_skipped",
        "phase_change",
        "pipeline_transition",
    }
)


def format_flow_log(stage: str, content: str) -> str:
    """兼容旧调用：包装为 JSON ``text``。"""
    return format_flow_log_json(stage, {"message": (content or "").strip() or "（无详情）"})


def format_flow_log_json(
    stage: str,
    data: dict[str, Any],
    *,
    event: str = "",
) -> str:
    """生成写入 history ``text`` 的 JSON 字符串。"""
    envelope = {
        "log": FLOW_LOG_PREFIX,
        "version": FLOW_LOG_JSON_VERSION,
        "flow_stage": (stage or "流程").strip(),
        "event": (event or "").strip(),
        "data": data,
    }
    return json.dumps(envelope, ensure_ascii=False, indent=2, default=str)


def is_flow_log_formatted(text: str) -> bool:
    return str(text or "").strip().startswith(FLOW_LOG_PREFIX)


def is_flow_log_json(text: str) -> bool:
    raw = str(text or "").strip()
    if not raw.startswith("{"):
        return False
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return False
    return isinstance(obj, dict) and obj.get("log") == FLOW_LOG_PREFIX


def resolve_flow_stage(event: dict[str, Any]) -> str:
    explicit = str(event.get("flow_stage") or "").strip()
    if explicit:
        return explicit
    et = str(event.get("event") or "").strip()
    return EVENT_FLOW_STAGE.get(et, et or "流程")


def _event_meta_fields(event: dict[str, Any]) -> dict[str, Any]:
    """从事件行提取适合放入 JSON 的元字段（排除 text/payload 等大字段）。"""
    skip = frozenset({"text", "message", "payload", "ts", "flow_stage"})
    out: dict[str, Any] = {}
    for key, val in event.items():
        if key in skip:
            continue
        if isinstance(val, (str, int, float, bool)) or val is None:
            out[key] = val
        elif isinstance(val, (list, dict)):
            out[key] = val
    return out


def build_event_payload(event: dict[str, Any]) -> dict[str, Any]:
    """为缺少 payload 的事件合成结构化 data。"""
    et = str(event.get("event") or "")
    text = str(event.get("text") or event.get("message") or "").strip()
    meta = _event_meta_fields(event)

    if et == "room_opened":
        return {
            **meta,
            "room_id": event.get("room_id"),
            "scope_type": event.get("scope_type"),
            "scope_id": event.get("scope_id"),
            "current_node_id": event.get("current_node_id"),
            "stage_id": event.get("stage_id"),
            "userwork_synced": event.get("userwork_synced"),
            "sop_display": event.get("sop_display"),
            "local_process_state": event.get("local_process_state"),
        }
    if et == "pipeline_transition":
        return {
            **meta,
            "from_step": event.get("from_step"),
            "to_step": event.get("to_step"),
            "reason": event.get("reason"),
        }
    if et == "node_init":
        payload = event.get("payload")
        if isinstance(payload, dict):
            return payload
        return meta
    if et == "human_intervene":
        return {
            **meta,
            "message_type": event.get("message_type"),
            "content": text if text and not is_flow_log_json(text) else "",
        }
    if et == "delegation_finished" and text and not is_flow_log_json(text):
        return {**meta, "summary": text}
    if text and not is_flow_log_formatted(text) and not is_flow_log_json(text):
        return {**meta, "message": text}
    return meta


def build_event_body(event: dict[str, Any]) -> str:
    """兼容：由 payload 生成单行摘要（内部很少直接使用）。"""
    payload = build_event_payload(event)
    return json.dumps(payload, ensure_ascii=False, default=str)[:500]


def apply_flow_log_format(event: dict[str, Any]) -> dict[str, Any]:
    """为 history 事件写入 JSON 格式 ``text``，并保留 ``payload`` 副本。"""
    row = dict(event)
    existing = str(row.get("text") or row.get("message") or "").strip()
    if is_flow_log_json(existing):
        row.setdefault("flow_stage", resolve_flow_stage(row))
        if not isinstance(row.get("payload"), dict):
            try:
                row["payload"] = json.loads(existing).get("data")
            except json.JSONDecodeError:
                pass
        return row

    stage = resolve_flow_stage(row)
    et = str(row.get("event") or "")
    payload = row.get("payload")
    data = payload if isinstance(payload, dict) else build_event_payload(row)
    row["payload"] = data
    row["text"] = format_flow_log_json(stage, data, event=et)
    row["flow_stage"] = stage
    return row
