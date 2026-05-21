"""会议室节点初始化上下文日志（JSON）。"""

from __future__ import annotations

import json

import pytest

from synapse.rd_meeting.bootstrap import build_node_init_message
from synapse.rd_meeting.flow_log import is_flow_log_json
from synapse.rd_meeting.init_context import collect_meeting_init_sections, format_node_init_log


def test_format_node_init_log_is_json():
    text = format_node_init_log("demand", "21881451", node_id="req_clarify")
    assert is_flow_log_json(text)
    obj = json.loads(text)
    assert obj["flow_stage"] == "节点初始化"
    assert obj["event"] == "node_init"
    data = obj["data"]
    assert "order" in data
    assert "product" in data
    assert "system" in data


def test_collect_meeting_init_sections_structure():
    sec = collect_meeting_init_sections("demand", "x", node_id="req_clarify")
    assert sec["node"]["node_id"] == "req_clarify"
    assert "id" in sec["order"]
    assert "repos" in sec["product"]
    assert "synapse_url" in sec["system"]


def test_open_meeting_step1_userwork_and_init_log(monkeypatch, tmp_path):
    from synapse.rd_meeting.service import MeetingRoomService

    scope_id = "init-ctx-demand"
    uw_path = tmp_path / "userwork.json"
    uw_path.write_text(
        json.dumps(
            {
                "list": [
                    {
                        "demand_no": scope_id,
                        "demand_title": "标题A",
                        "demand_desc": "描述A",
                        "demand_impact": "",
                        "product_version_code": "PROD-X",
                        "product_version_id": 1,
                        "sop_node": "等待调度",
                        "local_process_state": "待处理",
                        "owned_work_items": [],
                    }
                ],
                "updated_at": "2026-01-01",
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    work = tmp_path / "work" / scope_id
    work.mkdir(parents=True)

    for mod in (
        "synapse.api.routes.dev_iwhalecloud",
        "synapse.rd_meeting.userwork_sync",
    ):
        monkeypatch.setattr(f"{mod}._owner_order_file_name", lambda: uw_path)
        monkeypatch.setattr(f"{mod}._owner_order_file_lock_path", lambda: tmp_path / "userwork.lock")
    monkeypatch.setattr("synapse.rd_meeting.paths.work_root", lambda: tmp_path / "work")
    hist = work / "room_history.jsonl"
    monkeypatch.setattr(
        "synapse.rd_meeting.room_runtime.room_history_path",
        lambda sid: hist,
    )

    svc = MeetingRoomService()
    detail = svc.open_meeting("demand", scope_id, sync_userwork=True, auto_run_first_node=False)

    assert detail.get("auto_run_started") is not True
    saved = json.loads(uw_path.read_text(encoding="utf-8"))
    demand = saved["list"][0]
    assert demand["local_process_state"] == "处理中"
    assert demand["sop_node"] == "需求澄清"

    hist_lines = [json.loads(ln) for ln in hist.read_text(encoding="utf-8").splitlines() if ln.strip()]
    events = [h["event"] for h in hist_lines]
    assert "room_opened" in events
    assert "node_init" in events

    opened = next(h for h in hist_lines if h["event"] == "room_opened")
    assert is_flow_log_json(opened["text"])
    opened_data = json.loads(opened["text"])["data"]
    assert opened_data["userwork_synced"] is True

    init_row = next(h for h in hist_lines if h["event"] == "node_init")
    assert is_flow_log_json(init_row["text"])
    init_data = json.loads(init_row["text"])["data"]
    assert init_data["order"]["id"] == scope_id
    assert init_data["order"]["title"] == "标题A"
    assert "小鲸" not in init_row["text"]
    assert isinstance(init_row.get("payload"), dict)
