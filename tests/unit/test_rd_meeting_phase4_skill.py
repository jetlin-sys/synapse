"""Phase 4：会议室通用规范装配、角色裁剪、能力卡片渲染。"""

from __future__ import annotations

import pytest

from synapse.rd_meeting.room_skill import (
    build_capability_cards,
    build_room_skill_prompt,
    get_meeting_room_rules,
    make_context,
    trim_skill_for_role,
)


@pytest.fixture
def host_binding() -> dict:
    return {
        "node_id": "boundary",
        "node_name": "边界确认",
        "stage_id": 1,
        "stage_name": "需求分析",
        "type": "ai",
        "intent": "识别跨产品边界，确保单需求单产品。",
        "host_profile_id": "default",
        "worker_profile_ids": [
            "whalecloud-requirement-expert",
            "whalecloud-design-expert",
        ],
        "skill_ids": [],
        "llm_endpoint_key": "worker-default",
        "host_llm_endpoint_key": "reasoning-heavy",
        "worker_llm_endpoint_key": "worker-default",
        "prompt_supplement": "本产品为账务中心，优先复用存量限流方案。",
    }


def test_meeting_room_rules_is_builtin_no_external_file():
    """会议室通用规范内嵌在 room_skill.py，与 SKILL 加载机制无关。"""
    body = get_meeting_room_rules()
    assert body, "内置规范正文不应为空"
    assert "## 1. 节点成功标准" in body
    assert "## 6. 不变量" in body
    assert "name: whalecloud-dev-tool-meeting-room" not in body, "不应再含 front-matter"


def test_trim_skill_for_role_hides_other_perspective():
    body = get_meeting_room_rules()
    host_view = trim_skill_for_role(body, "host")
    worker_view = trim_skill_for_role(body, "worker")

    assert "## 3. 小鲸（Host）的工作循环" in host_view
    assert "## 4. 协作智能体（Worker）的协作规范" not in host_view

    assert "## 4. 协作智能体（Worker）的协作规范" in worker_view
    assert "## 3. 小鲸（Host）的工作循环" not in worker_view


def test_build_capability_cards_lists_host_and_workers(host_binding):
    cards = build_capability_cards(
        host_profile_id=host_binding["host_profile_id"],
        worker_profile_ids=host_binding["worker_profile_ids"],
        host_llm_endpoint=host_binding["host_llm_endpoint_key"],
        worker_llm_endpoint=host_binding["worker_llm_endpoint_key"],
    )
    assert "角色：host" in cards
    assert "角色：worker" in cards
    assert "whalecloud-requirement-expert" in cards
    assert "whalecloud-design-expert" in cards
    assert "reasoning-heavy" in cards


def test_build_capability_cards_excludes_self_for_worker(host_binding):
    cards = build_capability_cards(
        host_profile_id=host_binding["host_profile_id"],
        worker_profile_ids=host_binding["worker_profile_ids"],
        host_llm_endpoint=host_binding["host_llm_endpoint_key"],
        worker_llm_endpoint=host_binding["worker_llm_endpoint_key"],
        exclude_self_id="whalecloud-requirement-expert",
    )
    # 自己的 worker 卡片应被排除（host 卡片仍渲染）
    worker_cards = [seg for seg in cards.split("\n\n") if "角色：worker" in seg]
    assert all("whalecloud-requirement-expert" not in seg for seg in worker_cards)
    assert "whalecloud-design-expert" in cards
    assert "角色：host" in cards, "Host 卡片对 Worker 仍然可见"


def test_build_capability_cards_host_view_excludes_host_itself(host_binding):
    """Host 视角时，host 自己的卡片也应被排除（include_host=False）。"""
    cards = build_capability_cards(
        host_profile_id=host_binding["host_profile_id"],
        worker_profile_ids=host_binding["worker_profile_ids"],
        host_llm_endpoint=host_binding["host_llm_endpoint_key"],
        worker_llm_endpoint=host_binding["worker_llm_endpoint_key"],
        include_host=False,
    )
    assert "角色：host" not in cards, "Host 视角下不应渲染 host 自己的卡片"
    assert "角色：worker" in cards
    assert "whalecloud-requirement-expert" in cards


def test_build_room_skill_prompt_renders_context_vars(host_binding, monkeypatch):
    monkeypatch.setattr(
        "synapse.rd_meeting.init_context.resolve_product_for_meeting",
        lambda *_a, **_k: (
            {"locator_code": "ok", "prod": "p1", "repos": [], "docs": []},
            {"synapse_url": "http://127.0.0.1:10001"},
        ),
    )
    monkeypatch.setattr(
        "synapse.rd_meeting.init_context._scope_row",
        lambda *_a, **_k: {"demand_no": "21878317", "demand_title": "演示工单", "prod": "p1"},
    )
    monkeypatch.setattr(
        "synapse.rd_meeting.userwork_sync.load_scope_work_order_context",
        lambda *_a, **_k: {"demand_no": "21878317", "demand_title": "演示工单", "prod": "p1"},
    )
    ctx = make_context(
        role="host",
        binding=host_binding,
        scope_type="demand",
        scope_id="21878317",
        ticket_title="演示工单",
        archive_dir="/tmp/work/21878317/archive/1/boundary",
    )
    rendered = build_room_skill_prompt(ctx, binding=host_binding)

    assert "{ROLE}" not in rendered
    assert "host" in rendered
    assert "21878317" in rendered
    assert "\u6f14\u793a\u5de5\u5355" in rendered
    assert "边界确认" in rendered
    # host 视角下不渲染 host 自己的能力卡片，所以 host 端点不应出现；worker 端点仍在 worker 卡片里
    assert "reasoning-heavy" not in rendered, "host 视角下不应再次出现自己的端点（避免自我介绍）"
    assert "worker-default" in rendered
    assert "## 1. 节点成功标准" in rendered
    assert "## 3. 小鲸（Host）的工作循环" in rendered
    assert "## 4. 协作智能体（Worker）的协作规范" not in rendered
    assert "本产品为账务中心" in rendered, "运营补充应出现在四段式第一节"
    assert "## 一、本 SOP 环节工作信息" in rendered
    assert "{DYNAMIC_MEETING_CONTEXT}" not in rendered
    assert rendered.count("## 二、工单信息") == 1, "工单段不应在通用规范正文中重复出现"
    # 能力卡片应排除自己（host 视角时不渲染 host 自己卡）
    assert "## 参会能力卡片" in rendered
    # 会议任务展示为「阶段名 + 节点名」格式
    assert "需求分析阶段的边界确认任务" in rendered
    # node_intent 作为会议目标独立展示
    assert "识别跨产品边界" in rendered, "node_intent 应作为「会议目标」字段展示"


def test_build_room_skill_prompt_worker_view(host_binding):
    ctx = make_context(
        role="worker",
        binding=host_binding,
        scope_type="demand",
        scope_id="21878317",
        ticket_title="演示工单",
        archive_dir="/tmp/work/21878317/archive/1/boundary",
    )
    rendered = build_room_skill_prompt(ctx)
    assert "## 4. 协作智能体（Worker）的协作规范" in rendered
    assert "## 3. 小鲸（Host）的工作循环" not in rendered
    # Worker 视角下不再渲染「参会能力卡片」，改为渲染当前 worker 自己的「能力档案」
    assert "## 参会能力卡片" not in rendered, "worker 不允许委派，不应再看到他人能力卡片"
    assert "## 你的能力档案" in rendered
    # 自己的 worker id 应出现在能力档案中
    assert "whalecloud-requirement-expert" in rendered
    # 不应再有 §4.6 worker↔worker 段
    assert "Worker ↔ Worker 协作" not in rendered, "worker 之间不能直接协作，§4.6 应被移除"


def test_no_legacy_meeting_skill_api():
    """确保旧的 meeting_skill 相关 API 已彻底移除。"""
    import synapse.rd_meeting.room_skill as room_skill

    for name in (
        "DEFAULT_MEETING_SKILL_ID",
        "load_meeting_skill_body",
        "meeting_skill_preview",
        "meeting_room_rules_preview",
        "find_meeting_skill_file",
    ):
        assert not hasattr(room_skill, name), f"{name} 应已从 room_skill 模块中移除"
