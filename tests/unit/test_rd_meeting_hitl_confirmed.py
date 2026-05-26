"""hitl_confirmed.md 累积台账：写入与 prompt 注入。"""

from __future__ import annotations

import pytest

from synapse.rd_meeting.hitl_confirmed import (
    HITL_CONFIRMED_FILENAME,
    append_hitl_confirmed,
    format_hitl_confirmed_cumulative_prompt,
    hitl_confirmed_path,
    read_hitl_confirmed,
    split_hitl_confirmed_rounds,
)
from synapse.rd_meeting.user_context import (
    append_user_context_pending,
    drain_user_context_for_prompt,
)


@pytest.fixture
def synapse_work_home(monkeypatch: pytest.MonkeyPatch, tmp_path):
    work = tmp_path / "work"
    work.mkdir()
    monkeypatch.setattr("synapse.rd_meeting.paths.work_root", lambda: work)
    return work


def test_append_hitl_confirmed_creates_and_appends_rounds(synapse_work_home):
    scope_id = "21883520"
    node_id = "req_clarify"
    body1 = "[人工确认表单]\n\n## 用户问卷反馈\n\n**反馈模式**：仅选项"
    body2 = "[人工确认表单]\n\n## 用户问卷反馈\n\n**反馈模式**：含自由输入"

    p1 = append_hitl_confirmed(scope_id, node_id, body1, intervention_kind="interactive")
    assert p1 is not None
    assert p1.name == HITL_CONFIRMED_FILENAME
    assert "第 1 轮" in p1.read_text(encoding="utf-8")

    p2 = append_hitl_confirmed(scope_id, node_id, body2, intervention_kind="interactive")
    assert p2 == p1
    text = p2.read_text(encoding="utf-8")
    assert "第 1 轮" in text
    assert "第 2 轮" in text
    assert text.index("第 1 轮") < text.index("第 2 轮")


def test_split_hitl_confirmed_rounds():
    single = "# 标题\n\n## 第 1 轮 · interactive · t\n\nround1"
    prior, latest = split_hitl_confirmed_rounds(single)
    assert prior == ""
    assert "第 1 轮" in latest

    multi = (
        "# 标题\n\n## 第 1 轮 · interactive · t1\n\nround1\n\n"
        "## 第 2 轮 · interactive · t2\n\nround2"
    )
    prior2, latest2 = split_hitl_confirmed_rounds(multi)
    assert "第 1 轮" in prior2
    assert "第 2 轮" not in prior2
    assert "第 2 轮" in latest2


def test_cumulative_prompt_excludes_latest_round(synapse_work_home):
    scope_id = "21883521"
    node_id = "req_clarify"
    append_hitl_confirmed(scope_id, node_id, "round-one-body", intervention_kind="interactive")
    append_hitl_confirmed(scope_id, node_id, "round-two-body", intervention_kind="interactive")

    cumulative = format_hitl_confirmed_cumulative_prompt(scope_id, node_id)
    assert "本节点已确认的人工决策（累积）" in cumulative
    assert "round-one-body" in cumulative
    assert "round-two-body" not in cumulative


def test_cumulative_empty_when_single_round(synapse_work_home):
    scope_id = "21883524"
    node_id = "req_clarify"
    append_hitl_confirmed(scope_id, node_id, "only-round", intervention_kind="interactive")
    assert format_hitl_confirmed_cumulative_prompt(scope_id, node_id) == ""


def test_cumulative_plus_pending_pattern(synapse_work_home):
    """累积段（先前轮）+ pending（本轮）组合，与 orchestrator 注入顺序一致。"""
    scope_id = "21883522"
    node_id = "req_clarify"
    append_hitl_confirmed(scope_id, node_id, "prior-round-content", intervention_kind="interactive")
    append_hitl_confirmed(scope_id, node_id, "current-round-content", intervention_kind="interactive")
    append_user_context_pending(scope_id, "current-round-content")

    cumulative = format_hitl_confirmed_cumulative_prompt(scope_id, node_id)
    pending = drain_user_context_for_prompt(scope_id)

    assert "prior-round-content" in cumulative
    assert "current-round-content" not in cumulative
    assert "current-round-content" in pending


def test_hitl_confirmed_path_uses_stage_name(synapse_work_home):
    scope_id = "21883523"
    node_id = "req_clarify"
    path = hitl_confirmed_path(scope_id, "需求分析", node_id)
    assert path.as_posix().endswith("archive/需求分析/req_clarify/hitl_confirmed.md")
    append_hitl_confirmed(scope_id, node_id, "x", stage_name="需求分析")
    assert read_hitl_confirmed(scope_id, node_id, stage_name="需求分析") != ""
