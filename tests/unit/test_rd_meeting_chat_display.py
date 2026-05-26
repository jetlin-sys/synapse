"""协作会议流结构化展示."""

from __future__ import annotations

from synapse.rd_meeting.chat_display import expand_history_event_to_chat
from synapse.rd_meeting.room_runtime import history_to_chat_logs


def test_node_started_splits_context_and_participants() -> None:
    ev = {
        "event": "node_started",
        "room_id": "mr_d_1",
        "node_id": "req_clarify",
        "agent_id": "default",
        "text": '{"order":{"id":"1","title":"T"},"product":{"prod":"P"},"system":{}}',
        "binding": {"host_profile_id": "default", "worker_profile_ids": ["w1", "w2"]},
        "participants": [
            {"profile_id": "default", "role": "host", "display_name": "小鲸"},
            {"profile_id": "w1", "role": "worker", "display_name": "专家A"},
        ],
        "ts": "2026-05-21T10:00:00",
    }
    rows = expand_history_event_to_chat(ev, 0)
    kinds = [r["displayKind"] for r in rows]
    assert "node_context" in kinds
    assert "participants" in kinds
    assert all(r["speakerRole"] == "system" for r in rows)


def test_work_plan_is_system_role() -> None:
    rows = expand_history_event_to_chat(
        {
            "event": "work_plan_submitted",
            "text": "# 工作安排计划\n\n**目标**：澄清",
            "agent_id": "default",
            "ts": "2026-05-21T10:01:00",
        },
        1,
    )
    assert len(rows) == 1
    assert rows[0]["speakerRole"] == "system"
    assert rows[0]["displayKind"] == "work_plan"


def test_delegation_roles() -> None:
    start = expand_history_event_to_chat(
        {
            "event": "delegation_started",
            "text": "小鲸 → 专家：已委派协作（原因）\n任务：做某事\n计划项：t1",
            "agent_id": "default",
            "to_agent": "w1",
            "plan_item_id": "t1",
            "ts": "2026-05-21T10:02:00",
        },
        2,
    )[0]
    assert start["speakerRole"] == "host"
    assert start["displayKind"] == "delegation_start"

    done = expand_history_event_to_chat(
        {
            "event": "delegation_finished",
            "text": "专家 completed · 120s：摘要",
            "to_agent": "w1",
            "ok": True,
            "ts": "2026-05-21T10:10:00",
        },
        3,
    )[0]
    assert done["speakerRole"] == "worker"
    assert done["displayKind"] == "delegation_done"


def test_hitl_dynamic_system() -> None:
    rows = expand_history_event_to_chat(
        {
            "event": "hitl_dynamic",
            "detail": "主控通过工具提交问卷 kind=interactive questions=22",
            "agent_id": "default",
            "source": "tool",
            "ts": "2026-05-21T11:00:00",
        },
        4,
    )
    assert rows[0]["speakerRole"] == "system"
    assert rows[0]["displayKind"] == "hitl_tool"
