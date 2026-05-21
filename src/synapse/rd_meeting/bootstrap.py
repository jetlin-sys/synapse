"""会议室节点启动：初始化文案写入协作会议流。"""

from __future__ import annotations

from typing import Any

from synapse.rd_meeting.participants import build_meeting_participants
from synapse.rd_meeting.room_runtime import append_history_event
from synapse.rd_sop.nodes import node_display_name


def build_node_init_message(binding: dict[str, Any], *, node_id: str) -> str:
    """小鲸主持本节点时的初始化说明（写入 room_history / 对话层）。"""
    participants = build_meeting_participants(binding)
    worker_labels = "、".join(
        p["display_name"] for p in participants if p.get("role") == "worker"
    ) or "（未配置协作智能体）"
    node_name = node_display_name(node_id)
    intent_txt = str(binding.get("node_intent") or binding.get("intent") or "").strip()
    lines = [
        f"【节点启动】{node_name}",
        f"我是小鲸，已主持本议题。协作阵容：{worker_labels}。",
    ]
    if intent_txt:
        lines.append(f"会议目标：{intent_txt}")
    lines.append(
        "接下来我会梳理议程，并通过 delegate 向上述协作智能体安排任务；"
        "本对话流将展示【任务安排】与【协作反馈】记录。"
        "需要您澄清时，将依据协作产出动态生成问卷（技能 ask-user），非固定模板。"
    )
    return "\n".join(lines)


def append_node_init_chat(
    scope_id: str,
    *,
    room_id: str,
    node_id: str,
    binding: dict[str, Any],
) -> str:
    """将节点初始化消息追加到 room_history（开会瞬间即可见，不依赖 LLM 跑完）。"""
    text = build_node_init_message(binding, node_id=node_id)
    host_id = str(binding.get("host_profile_id") or "default")
    participants = build_meeting_participants(binding)
    append_history_event(
        scope_id,
        {
            "event": "node_init",
            "room_id": room_id,
            "node_id": node_id,
            "text": text,
            "agent_id": host_id,
            "log_type": "info",
            "participants": participants,
        },
    )
    return text
