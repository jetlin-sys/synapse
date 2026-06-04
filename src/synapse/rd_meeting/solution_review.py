"""方案评审节点：结构化 payload、人工裁决与拆单计划落盘。"""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from synapse.rd_meeting.paths import archive_node_dir
from synapse.rd_meeting.prior_outputs import collect_prior_artifact_rows
from synapse.rd_sop.nodes import stage_id_for_node_id

logger = logging.getLogger(__name__)

NODE_ID = "solution_review"
STAGE_NAME = "需求设计"


def uses_solution_review_gate(node_id: str) -> bool:
    """该节点走专用方案评审门控，不走 NODE_REVIEW / generate_agent_summaries。"""
    return (node_id or "").strip() == NODE_ID
JSON_NAME = "solution_review.json"
SPLIT_PLAN_NAME = "split_plan.json"
CONCLUSION_NAME = "方案评审结论.md"
SCHEMA_VERSION = 1

_TABLE_ROW_RE = re.compile(r"^\|(.+)\|$")
_SECTION_RE = re.compile(r"^#{1,4}\s+(.+)$")


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def archive_dir(scope_id: str) -> Path:
    return archive_node_dir(scope_id, STAGE_NAME, NODE_ID)


def json_path(scope_id: str) -> Path:
    return archive_dir(scope_id) / JSON_NAME


def split_plan_path(scope_id: str) -> Path:
    return archive_dir(scope_id) / SPLIT_PLAN_NAME


def conclusion_path(scope_id: str) -> Path:
    return archive_dir(scope_id) / CONCLUSION_NAME


def _read_json_file(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("solution_review json read failed %s: %s", path, exc)
        return None
    return data if isinstance(data, dict) else None


def _write_json_file(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _parse_md_table_rows(section_body: str) -> list[dict[str, str]]:
    lines = [ln.strip() for ln in (section_body or "").splitlines()]
    headers: list[str] = []
    rows: list[dict[str, str]] = []
    for line in lines:
        m = _TABLE_ROW_RE.match(line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(1).split("|")]
        if not cells or all(set(c) <= {"-", " "} for c in cells):
            continue
        if not headers:
            headers = cells
            continue
        if len(cells) < len(headers):
            cells.extend([""] * (len(headers) - len(cells)))
        rows.append({headers[i]: cells[i] if i < len(cells) else "" for i in range(len(headers))})
    return rows


def _extract_section(md: str, heading_prefix: str) -> str:
    """提取以 heading_prefix 开头的章节正文（到下一同级或更高级标题为止）。"""
    lines = (md or "").splitlines()
    start = -1
    level = 0
    for i, line in enumerate(lines):
        m = _SECTION_RE.match(line.strip())
        if not m:
            continue
        title = m.group(1).strip()
        lv = len(line) - len(line.lstrip("#"))
        if start < 0 and title.startswith(heading_prefix):
            start = i + 1
            level = lv
            continue
        if start >= 0 and lv <= level:
            break
    if start < 0:
        return ""
    end = len(lines)
    for j in range(start, len(lines)):
        m = _SECTION_RE.match(lines[j].strip())
        if m:
            lv = len(lines[j]) - len(lines[j].lstrip("#"))
            if lv <= level:
                end = j
                break
    return "\n".join(lines[start:end]).strip()


def parse_func_solution_md(md: str) -> dict[str, Any]:
    """从函数级方案 Markdown 抽取 §1.3 仓库表与 §1.10 影响评估。"""
    repos_raw = _parse_md_table_rows(_extract_section(md, "1.3 涉及仓库"))
    repos: list[dict[str, Any]] = []
    for row in repos_raw:
        repos.append(
            {
                "branch_version_id": str(
                    row.get("产品分支ID") or row.get("branch_version_id") or ""
                ).strip(),
                "repo_url": str(row.get("仓库地址") or row.get("repo_url") or "").strip(),
                "change_summary": str(
                    row.get("改造内容") or row.get("change_summary") or ""
                ).strip(),
                "product_module_name": str(row.get("应用模块") or row.get("product_module_name") or "").strip(),
                "branch_version_name": str(
                    row.get("产品分支") or row.get("branch_version_name") or ""
                ).strip(),
            }
        )

    def _impact(key: str, section_title: str) -> list[dict[str, str]]:
        return _parse_md_table_rows(_extract_section(md, section_title))

    impact = {
        "performance": _impact("1.10.1", "1.10.1 性能影响分析"),
        "functional": _impact("1.10.2", "1.10.2 功能影响分析"),
        "config": _impact("1.10.3", "1.10.3 配置变更说明"),
        "upgrade_risk": _impact("1.10.4", "1.10.4 升级风险"),
        "security": _impact("1.10.5", "1.10.5 安全影响"),
        "compatibility": _impact("1.10.6", "1.10.6 兼容性影响"),
        "ui_ue": _impact("1.10.7", "1.10.7 UI/UE设计"),
    }
    return {"repos": repos, "impact_assessment": impact}


def _func_solution_archive_path(scope_id: str) -> Path:
    return archive_node_dir(scope_id, STAGE_NAME, "func_solution") / "函数级方案.md"


def enrich_payload_from_archive(scope_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """若 JSON 缺少解析段，尝试从归档的函数级方案.md 补全。"""
    parsed = payload.get("func_solution_parsed")
    if isinstance(parsed, dict) and parsed.get("repos"):
        return payload
    fpath = _func_solution_archive_path(scope_id)
    if not fpath.is_file():
        return payload
    try:
        md = fpath.read_text(encoding="utf-8")
    except OSError:
        return payload
    extracted = parse_func_solution_md(md)
    out = dict(payload)
    out["func_solution_parsed"] = {
        **(parsed if isinstance(parsed, dict) else {}),
        **extracted,
    }
    return out


def collect_stage2_artifact_inputs(
    scope_id: str,
    *,
    skipped_node_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    rows = collect_prior_artifact_rows(scope_id, NODE_ID, skipped_node_ids=skipped_node_ids)
    out: list[dict[str, Any]] = []
    for row in rows:
        if stage_id_for_node_id(row.source_node_id) != 2:
            continue
        rel = ""
        if row.archive_path and row.file_exists:
            try:
                from synapse.rd_meeting.paths import scope_dir

                rel = Path(row.archive_path).resolve().relative_to(scope_dir(scope_id).resolve()).as_posix()
            except ValueError:
                rel = row.archive_path
        out.append(
            {
                "node_id": row.source_node_id,
                "node_name": row.source_node_name,
                "artifact": row.artifact,
                "relative_path": rel,
                "file_exists": row.file_exists,
                "node_enabled": row.node_enabled,
                "node_skipped": row.node_skipped,
                "included": row.node_enabled and not row.node_skipped and row.file_exists,
            }
        )
    return out


def load_solution_review_payload(
    scope_id: str,
    *,
    skipped_node_ids: set[str] | None = None,
) -> dict[str, Any] | None:
    data = _read_json_file(json_path(scope_id))
    if data is None:
        return None
    data = enrich_payload_from_archive(scope_id, data)
    if "inputs" not in data or not isinstance(data.get("inputs"), dict):
        data["inputs"] = {}
    data["inputs"]["stage2_artifacts"] = collect_stage2_artifact_inputs(
        scope_id, skipped_node_ids=skipped_node_ids
    )
    return data


def validate_solution_review_json(scope_id: str) -> tuple[bool, list[str]]:
    data = _read_json_file(json_path(scope_id))
    if data is None:
        return False, [f"缺少 {JSON_NAME}"]
    errors: list[str] = []
    whale = data.get("whale_review")
    if not isinstance(whale, dict):
        errors.append("whale_review 必须为对象")
    elif whale.get("score") is None:
        errors.append("whale_review.score 必填")
    draft = data.get("split_tasks_draft")
    if not isinstance(draft, list) or not draft:
        errors.append("split_tasks_draft 须为非空数组")
    return len(errors) == 0, errors


def _summarize_impact_table(rows: list[dict[str, str]], *, keys: list[str]) -> str:
    parts: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        seg = "；".join(f"{k}:{row.get(k, '')}" for k in keys if str(row.get(k, "")).strip())
        if seg.strip():
            parts.append(seg)
    return "\n".join(parts) if parts else "（无显式影响项，见函数级方案 §1.10）"


def _build_impact_strings(impact: dict[str, Any]) -> dict[str, str]:
    perf = impact.get("performance") if isinstance(impact.get("performance"), list) else []
    func = impact.get("functional") if isinstance(impact.get("functional"), list) else []
    cfg = impact.get("config") if isinstance(impact.get("config"), list) else []
    risk = impact.get("upgrade_risk") if isinstance(impact.get("upgrade_risk"), list) else []
    sec = impact.get("security") if isinstance(impact.get("security"), list) else []
    compat = impact.get("compatibility") if isinstance(impact.get("compatibility"), list) else []
    return {
        "performanceImpact": _summarize_impact_table(
            perf,
            keys=["变更点", "性能影响类型", "影响程度", "规避措施"],
        ),
        "functionalImpact": _summarize_impact_table(
            func,
            keys=["影响类型", "影响模块", "影响说明", "影响范围"],
        ),
        "cfgChangeDescription": _summarize_impact_table(
            cfg,
            keys=["配置项", "变更类型", "变更说明"],
        ),
        "upgradeRisk": _summarize_impact_table(
            risk,
            keys=["风险类型", "风险描述", "风险等级", "规避措施"],
        ),
        "securityImpact": _summarize_impact_table(
            sec,
            keys=["安全维度", "影响说明", "影响程度", "安全措施"],
        ),
        "compatibilityImpact": _summarize_impact_table(
            compat,
            keys=["兼容类型", "兼容项", "兼容性评估", "说明"],
        ),
    }


def _default_task_impact_desc(impact: dict[str, Any]) -> str:
    func = impact.get("functional") if isinstance(impact.get("functional"), list) else []
    lines = []
    for row in func[:5]:
        if isinstance(row, dict):
            lines.append(str(row.get("影响说明") or row.get("影响模块") or "").strip())
    return "；".join(x for x in lines if x) or "见函数级方案影响评估章节"


def ensure_split_tasks_draft(payload: dict[str, Any], demand_no: str) -> list[dict[str, Any]]:
    existing = payload.get("split_tasks_draft")
    if isinstance(existing, list) and existing:
        return [dict(x) for x in existing if isinstance(x, dict)]

    parsed = payload.get("func_solution_parsed") if isinstance(payload.get("func_solution_parsed"), dict) else {}
    repos = parsed.get("repos") if isinstance(parsed.get("repos"), list) else []
    impact = parsed.get("impact_assessment") if isinstance(parsed.get("impact_assessment"), dict) else {}
    impacts = _build_impact_strings(impact)
    task_impact = _default_task_impact_desc(impact)
    title_base = str(payload.get("requirement_name") or payload.get("demand_title") or demand_no).strip()

    if not repos:
        return [
            {
                "taskNo": demand_no,
                "taskTitle": f"{title_base} 研发实施",
                "comments": str((payload.get("whale_review") or {}).get("summary_markdown") or "")[:2000],
                "productModuleName": "",
                "branchVersionName": "",
                "patchName": "",
                "taskImpactDesc": task_impact,
                **impacts,
                "branch_version_id": "",
            }
        ]

    tasks: list[dict[str, Any]] = []
    for repo in repos:
        if not isinstance(repo, dict):
            continue
        mod = str(repo.get("product_module_name") or "").strip()
        branch = str(repo.get("branch_version_name") or "").strip()
        tasks.append(
            {
                "taskNo": demand_no,
                "taskTitle": f"{title_base} — {mod or '研发子单'}",
                "comments": str(repo.get("change_summary") or "")[:2000],
                "productModuleName": mod,
                "branchVersionName": branch,
                "patchName": "",
                "taskImpactDesc": task_impact,
                **impacts,
                "branch_version_id": str(repo.get("branch_version_id") or "").strip(),
            }
        )
    return tasks or [
        {
            "taskNo": demand_no,
            "taskTitle": f"{title_base} 研发实施",
            "comments": "",
            "productModuleName": "",
            "branchVersionName": "",
            "patchName": "",
            "taskImpactDesc": task_impact,
            **impacts,
            "branch_version_id": "",
        }
    ]


def render_conclusion_markdown(payload: dict[str, Any]) -> str:
    whale = payload.get("whale_review") if isinstance(payload.get("whale_review"), dict) else {}
    human = payload.get("human_review") if isinstance(payload.get("human_review"), dict) else {}
    score = whale.get("score", "—")
    verdict = whale.get("verdict", "—")
    h_status = human.get("status", "pending")
    h_comment = str(human.get("comment") or "").strip()
    summary = str(whale.get("summary_markdown") or "").strip()
    suggestions = whale.get("suggestions") if isinstance(whale.get("suggestions"), list) else []

    lines = [
        "# 方案评审结论",
        "",
        f"- **评审时间**：{payload.get('reviewed_at') or _now_iso()}",
        f"- **需求单号**：{payload.get('demand_no') or '—'}",
        f"- **小鲸评分**：{score}",
        f"- **小鲸结论**：{verdict}",
        f"- **人工评审状态**：{h_status}",
        "",
        "## 小鲸总评",
        "",
        summary or "（无）",
        "",
        "## 评审建议",
        "",
    ]
    if not suggestions:
        lines.append("（无结构化建议）")
    else:
        for i, s in enumerate(suggestions, 1):
            if not isinstance(s, dict):
                continue
            lines.append(
                f"{i}. **[{s.get('severity', 'info')}]** {s.get('title', '')} — {s.get('detail', '')}"
            )
    lines.extend(["", "## 人工评审意见", "", h_comment or "（待填写）", ""])
    if h_status == "rejected":
        lines.extend(["## 结论", "", "**评审未通过**，流程已阻断，请修订方案后重新发起评审。", ""])
    elif h_status == "approved":
        lines.extend(["## 结论", "", "**评审通过**，拆单计划已落盘，可进入自动拆单节点。", ""])
    return "\n".join(lines)


def apply_patch_selections(
    tasks: list[dict[str, Any]],
    patches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    patch_map = {
        str(p.get("branch_version_id") or "").strip(): str(p.get("patch_name") or p.get("patchName") or "").strip()
        for p in patches
        if isinstance(p, dict)
    }
    out: list[dict[str, Any]] = []
    for task in tasks:
        row = dict(task)
        bid = str(row.get("branch_version_id") or "").strip()
        if bid and bid in patch_map:
            row["patchName"] = patch_map[bid]
        out.append(row)
    return out


HumanDecision = Literal["approve", "reject"]


def apply_human_decision(
    scope_id: str,
    *,
    decision: HumanDecision,
    comment: str,
    patches: list[dict[str, Any]] | None = None,
    demand_no: str = "",
) -> dict[str, Any]:
    """写入人工裁决、拆单计划与评审结论；返回更新后的 payload。"""
    payload = load_solution_review_payload(scope_id) or {}
    if not demand_no:
        demand_no = str(payload.get("demand_no") or scope_id).strip()

    status = "approved" if decision == "approve" else "rejected"
    payload["human_review"] = {
        "status": status,
        "comment": (comment or "").strip(),
        "decided_at": _now_iso(),
    }
    payload["reviewed_at"] = payload.get("reviewed_at") or _now_iso()

    tasks = ensure_split_tasks_draft(payload, demand_no)
    if decision == "approve":
        if not patches:
            raise ValueError("patches_required")
        tasks = apply_patch_selections(tasks, patches)
        for t in tasks:
            if not str(t.get("patchName") or "").strip():
                bid = str(t.get("branch_version_id") or "").strip()
                raise ValueError(f"patch_required_for_branch:{bid or 'unknown'}")

    payload["split_tasks_draft"] = tasks
    _write_json_file(json_path(scope_id), payload)

    if decision == "approve":
        plan = {
            "schema_version": SCHEMA_VERSION,
            "demand_no": demand_no,
            "approved_at": _now_iso(),
            "human_comment": (comment or "").strip(),
            "tasks": tasks,
        }
        _write_json_file(split_plan_path(scope_id), plan)
    else:
        if split_plan_path(scope_id).is_file():
            try:
                split_plan_path(scope_id).unlink()
            except OSError:
                pass

    conclusion_path(scope_id).write_text(render_conclusion_markdown(payload), encoding="utf-8")
    return payload


def load_split_plan(scope_id: str) -> dict[str, Any] | None:
    return _read_json_file(split_plan_path(scope_id))
