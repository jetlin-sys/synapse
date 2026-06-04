"""会议室中栏 intervention_panel 解析。"""

from __future__ import annotations

from synapse.rd_meeting.intervention_panel import resolve_intervention_panel
from synapse.rd_sop.manifest import default_human_confirm
from synapse.rd_meeting.binding import resolve_node_binding


def test_resolve_solution_review_panel() -> None:
    panel = resolve_intervention_panel(
        node_id="solution_review",
        intervention_kind="solution_review",
        pending_delivery={"solution_review_payload": {"schema_version": 1}},
    )
    assert panel == "solution_review"


def test_resolve_hitl_for_human_node() -> None:
    panel = resolve_intervention_panel(
        node_id="req_clarify",
        intervention_kind="interactive",
        hitl_form_schema={"title": "澄清", "questions": []},
    )
    assert panel == "hitl"


def test_ai_human_default_human_confirm() -> None:
    assert default_human_confirm("solution_review") is True
    assert default_human_confirm("boundary") is False


def test_binding_ai_human_forces_human_confirm_on() -> None:
    b = resolve_node_binding("solution_review")
    assert b.get("type") == "ai_human"
    assert b.get("human_confirm") is True


def test_binding_ai_forces_human_confirm_off() -> None:
    b = resolve_node_binding("boundary")
    assert b.get("type") == "ai"
    assert b.get("human_confirm") is False
