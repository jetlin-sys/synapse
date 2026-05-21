"""会议室流程日志格式。"""

import json

from synapse.rd_meeting.flow_log import (
    FLOW_LOG_PREFIX,
    apply_flow_log_format,
    is_flow_log_json,
)

from synapse.rd_meeting.room_runtime import append_history_event


def test_format_flow_log_json_envelope():
    from synapse.rd_meeting.flow_log import format_flow_log_json, is_flow_log_json

    line = format_flow_log_json("委派协作", {"message": "小鲸 → 需求专家"}, event="delegation_started")
    assert is_flow_log_json(line)
    obj = json.loads(line)
    assert obj["log"] == FLOW_LOG_PREFIX
    assert obj["flow_stage"] == "委派协作"
    assert obj["data"]["message"] == "小鲸 → 需求专家"


def test_apply_flow_log_format_room_opened():
    from synapse.rd_meeting.flow_log import is_flow_log_json

    row = apply_flow_log_format(
        {"event": "room_opened", "room_id": "r1", "current_node_id": "req_clarify"}
    )
    assert is_flow_log_json(row["text"])
    obj = json.loads(row["text"])
    assert obj["flow_stage"] == "开启会议室"
    assert obj["data"]["current_node_id"] == "req_clarify"


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
    assert is_flow_log_json(ev["text"])
    body = json.loads(ev["text"])
    assert body["flow_stage"] == "委派协作"
