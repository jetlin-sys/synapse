"""会议室流程日志格式。"""

from synapse.rd_meeting.flow_log import (
    FLOW_LOG_PREFIX,
    apply_flow_log_format,
    format_flow_log,
    is_flow_log_formatted,
)
import json

from synapse.rd_meeting.room_runtime import append_history_event


def test_format_flow_log():
    line = format_flow_log("委派协作", "小鲸 → 需求专家")
    assert line == f"{FLOW_LOG_PREFIX} -- 委派协作 -- 小鲸 → 需求专家"


def test_apply_flow_log_format_room_opened():
    row = apply_flow_log_format(
        {"event": "room_opened", "room_id": "r1", "current_node_id": "req_clarify"}
    )
    assert is_flow_log_formatted(row["text"])
    assert "开启会议室" in row["text"]
    assert "req_clarify" in row["text"]


def test_append_history_event_writes_formatted_line(tmp_path, monkeypatch):
    scope_id = "flow-log-scope"
    work = tmp_path / scope_id
    work.mkdir(parents=True)

    hist = work / "room_history.jsonl"
    monkeypatch.setattr(
        "synapse.rd_meeting.room_runtime.room_history_path",
        lambda sid: hist,
    )

    append_history_event(
        scope_id,
        {"event": "delegation_started", "text": "小鲸 → 专家：任务A", "agent_id": "host"},
    )
    assert hist.is_file()
    ev = json.loads(hist.read_text(encoding="utf-8").strip())
    assert ev["text"].startswith(FLOW_LOG_PREFIX)
    assert "委派协作" in ev["text"]
