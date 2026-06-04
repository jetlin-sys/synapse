"""方案评审：解析、裁决与落盘。"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from synapse.rd_meeting.solution_review import (
    apply_human_decision,
    parse_func_solution_md,
    render_conclusion_markdown,
    validate_solution_review_json,
)


SAMPLE_FUNC_SOLUTION = """# 函数级方案

## 1. 方案内容

### 1.3 涉及仓库
| 产品分支ID | 仓库地址 | 改造内容 |
|-----------|---------|---------|
| 4531 | https://git.example.com/repo.git | 改造计费模块 |

### 1.10 影响评估

#### 1.10.5 安全影响
| 安全维度 | 影响说明 | 影响程度 | 安全措施 | 备注 |
|---------|---------|---------|---------|------|
| 鉴权 | 新增接口需鉴权 | 中 | 沿用现有网关 | |
"""


def test_parse_func_solution_md_repos_and_security():
    parsed = parse_func_solution_md(SAMPLE_FUNC_SOLUTION)
    assert len(parsed["repos"]) == 1
    assert parsed["repos"][0]["branch_version_id"] == "4531"
    assert len(parsed["impact_assessment"]["security"]) == 1


def test_apply_human_decision_reject_writes_conclusion(tmp_path, monkeypatch):
    scope_id = "test-demand-001"
    work = tmp_path / scope_id
    archive = work / "archive" / "需求设计" / "solution_review"
    archive.mkdir(parents=True)

    payload = {
        "schema_version": 1,
        "demand_no": scope_id,
        "whale_review": {"score": 70, "verdict": "conditional_pass", "suggestions": []},
        "split_tasks_draft": [
            {
                "taskNo": scope_id,
                "taskTitle": "t",
                "comments": "c",
                "productModuleName": "m",
                "branchVersionName": "b",
                "patchName": "",
                "taskImpactDesc": "i",
                "performanceImpact": "p",
                "functionalImpact": "f",
                "cfgChangeDescription": "cfg",
                "upgradeRisk": "u",
                "securityImpact": "s",
                "compatibilityImpact": "c",
                "branch_version_id": "4531",
            }
        ],
    }
    (archive / "solution_review.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )

    monkeypatch.setattr(
        "synapse.rd_meeting.solution_review.archive_dir",
        lambda sid: archive if sid == scope_id else archive,
    )
    monkeypatch.setattr(
        "synapse.rd_meeting.solution_review.json_path",
        lambda sid: archive / "solution_review.json",
    )
    monkeypatch.setattr(
        "synapse.rd_meeting.solution_review.split_plan_path",
        lambda sid: archive / "split_plan.json",
    )
    monkeypatch.setattr(
        "synapse.rd_meeting.solution_review.conclusion_path",
        lambda sid: archive / "方案评审结论.md",
    )

    out = apply_human_decision(
        scope_id,
        decision="reject",
        comment="范围过大，需收缩",
        demand_no=scope_id,
    )
    assert out["human_review"]["status"] == "rejected"
    assert (archive / "方案评审结论.md").is_file()
    md = (archive / "方案评审结论.md").read_text(encoding="utf-8")
    assert "未通过" in md or "rejected" in md.lower() or "不通过" in md


def test_validate_solution_review_json_missing(tmp_path, monkeypatch):
    scope_id = "no-json"
    archive = tmp_path / scope_id / "archive" / "需求设计" / "solution_review"
    archive.mkdir(parents=True)
    monkeypatch.setattr(
        "synapse.rd_meeting.solution_review.json_path",
        lambda sid: archive / "solution_review.json",
    )
    ok, errs = validate_solution_review_json(scope_id)
    assert not ok
    assert errs
