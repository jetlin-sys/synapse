"""会议室运行时 system 上下文装配。

设计目标（对齐《多智能体研发会议室实现方案》§9）：

- 会议室通用规范是一段内嵌字符串（`_MEETING_ROOM_RULES`），与 SKILL 加载机制无关，
  仅作为本会议室的 system 上下文片段。小鲸（host）与所有协作智能体（worker）进入会议室后，
  都会拿到这份规范，并按角色裁剪可见段落。
- 同时渲染「参会能力卡片」（host 视角）/「你的能力档案」（worker 视角），让小鲸按能力
  边界派单、让 worker 清楚自己的身份与边界。
- `ask-user` 仍以独立 SKILL.md 形式存在（人机问卷格式与示例较多，单独维护）。

本模块只负责**装配 prompt 片段**，不直接调用 LLM；由 `orchestrator.run_current_node`
在执行节点时把渲染结果拼接到节点提示词中。
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from synapse.agents.profile import AgentProfile, get_profile_store
from synapse.rd_sop.nodes import node_display_name, stage_name_for_id

logger = logging.getLogger(__name__)

Role = Literal["host", "worker"]

DEFAULT_ASK_USER_SKILL_ID = "whalecloud-dev-tool-ask-user"
DEFAULT_LLM_ENDPOINT_KEY = "default"


# ─── SKILL.md 定位（仅供 ask-user 等真正的外部 SKILL 使用） ────────────


def _candidate_skill_dirs() -> list[Path]:
    """按优先级返回外部 SKILL 可能的根目录。

    顺序：
    1. settings.skills_path（生产模式：~/.synapse/workspaces/<ws>/skills）
    2. settings.project_root / skills（开发模式或开源仓库内）
    3. 仓库内 fallback：`<repo_root>/skills`，从本文件路径反推
    """
    candidates: list[Path] = []
    try:
        from synapse.config import settings

        candidates.append(Path(settings.skills_path))
        candidates.append(Path(settings.project_root) / "skills")
    except Exception as exc:
        logger.debug("settings unavailable in room_skill: %s", exc)

    try:
        repo_root = Path(__file__).resolve().parents[3]
        candidates.append(repo_root / "skills")
    except Exception:
        pass

    seen: set[Path] = set()
    out: list[Path] = []
    for p in candidates:
        try:
            rp = p.resolve()
        except Exception:
            rp = p
        if rp in seen:
            continue
        seen.add(rp)
        out.append(p)
    return out


def _find_external_skill_file(skill_id: str) -> Path | None:
    """在标准技能目录中查找外部 SKILL.md 文件（ask-user 等）。"""
    sid = (skill_id or "").strip()
    if not sid:
        return None
    for root in _candidate_skill_dirs():
        if not root.is_dir():
            continue
        path = root / sid / "SKILL.md"
        if path.is_file():
            return path
    return None


def load_ask_user_skill_body(skill_id: str = DEFAULT_ASK_USER_SKILL_ID) -> str:
    """读取人机问卷技能正文（host 专用片段，仍为外部 SKILL）。"""
    path = _find_external_skill_file(skill_id)
    if path is None:
        return ""
    try:
        return _strip_frontmatter(path.read_text(encoding="utf-8"))
    except OSError as exc:
        logger.warning("read ask-user skill %s failed: %s", path, exc)
        return ""


def get_meeting_room_rules() -> str:
    """返回会议室通用规范正文（内嵌常量，不再涉及 SKILL 加载）。"""
    return _MEETING_ROOM_RULES


def _strip_frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return text
    try:
        head, body = text.split("\n---", 1)
        if head.startswith("---"):
            body = body.lstrip("\n")
            return body
    except ValueError:
        return text
    return text


# ─── 内置会议室通用规范 ────────────────────────────────────────────────
#
# 这是会议室 system 上下文的"规则"部分，与 SKILL 加载机制无关——之前它曾经
# 是一份外部 `skills/whalecloud-dev-tool-meeting-room/SKILL.md`，现在直接内嵌。
# 仅保留**规范性**内容；议程 / 工单 / 产品 / 系统等数据由
# `build_dynamic_meeting_context` 注入 `{DYNAMIC_MEETING_CONTEXT}`；角色身份、
# 参会能力卡片由 `build_meeting_runtime_header` 渲染，**不在本规范正文中重复**。
_MEETING_ROOM_RULES = """# 研发会议室通用规范

> 本规范是研发会议室的「桌签」。任何参会智能体——主持人 **小鲸** 或协作智能体（需求 / 设计 / 研发 / 测试 / 质量 等专家）——进入会议室后都会在 system prompt 中加载这份规范，作为本场议程的协作宪法。
>
> 议程、工单、产品、系统参数**仅**出现在下方 §0 四段式动态上下文中；本规范正文**只**描述流程规则，不重复数据。
> 参会角色与能力清单见 system prompt 上方「参会能力卡片」段。

---

## 0. 本场会议动态上下文（四段式 · 唯一数据注入点）

```text
{DYNAMIC_MEETING_CONTEXT}
```

**不变量**：分派任务、核对能力边界、引用事实前**必须先读 §0**；不得臆造 §0 未出现的 URL、路径或 prod。

---

## 1. 节点成功标准与人工确认

会议成功的判定：交付物归档到 `archive/{STAGE_ID}/{NODE_ID}/`（路径见 §0 四 · `{ARCHIVE_DIR}`），且通过小鲸契合度 / 真实性 / 准确性检查。节点关闭（`enabled: false`）时跳过智能体并自动推进。

### 1.2 人工确认（`human_confirm`）语义

**SOP 节点类型 `human` / `human_start` 等**：表示该议程**人工参与度高、适合多轮人机交互**，**不等于**「仅人工处理、不跑智能体」。小鲸与 Worker 仍按 §3 协作；是否向用户请示、结果是否需确认，由 **`human_confirm` 开关**决定（开关取值见 system prompt 顶部「人工确认」字段）。

| 场景 | `human_confirm: true` | `human_confirm: false` | 例外 |
|------|----------------------|------------------------|------|
| **会议期间** | 可将 Worker 关键中间产物（如需求澄清问题列表）整理后主动提交用户审阅，支持多轮交互 | 小鲸自主决策，不必为常规中间产物逐条请示 | — |
| **会议结果** | 输出「待确认总结」→ 用户表单确认 → **才**写入归档并推进下一节点 | 自主收敛后直接归档并自动推进下一节点 | — |
| **异常** | 同左 | 同左 | **无论开关**：超时、质量/真实度不达标、风险不可控等，**必须**主动请求人工介入 |

推进下一节点时**不**根据下一节点是否为「人工型」额外挂门控；仅当**当前节点**开启结果确认且用户尚未确认时，节点流转才被阻塞。

---

## 3. 小鲸（Host）的工作循环

> 仅对 `{ROLE}=host` 生效。Worker 视角请跳到 §4。

小鲸是本会议室的**协调者**，按「拆分 → 派单 → 校验 → 收敛」循环推进。可用 Worker 名单及其能力边界见 system prompt 上方「参会能力卡片」段。

### 3.1 目标拆分与派单

- 复读 **§0 一、(2) 会议目标** 与 **§0 二、工单信息** 中的硬约束。
- 参考「参会能力卡片」中 worker 的技能列表，把节点目标拆分为可由具体 Worker 完成的子任务。
- **必须先**调用 `submit_meeting_work_plan` 提交结构化计划（每项含 `agent_id` / `task` / `reason`），再 `delegate_to_agent` 或 `delegate_parallel`（研发会议室强制）。
- 优先 `delegate_parallel` 启动可并行的只读 / 调研任务（建议带 `plan_item_id` 关联计划条目）。

### 3.2 检查反馈

Worker 返回结果后，逐项核对：

- **契合度**：是否针对你下发的子任务，是否回答了关键问题。
- **真实性**：引用的代码 / 文档 / 工单是否真实存在，能否复核。
- **准确性**：结论是否经得起源码 / 数据验证，是否存在臆造。

不通过则**明确**指出缺项并**重新 delegate** 给同一个 Worker（保留上下文，添加纠偏指令）。

### 3.3 多轮迭代

节点目标未达成前，按「拆分 → 检查」循环；必要时换人重派或要求 Worker 之间互助。收敛后，把多个 Worker 的产出综合成节点的最终交付物。

### 3.4 加载产品上下文（按需）

小鲸可主动调用以下能力（任一可用即可）：

- `whalecloud-dev-tool-base-scripts` → `gnx-tools.js` 检索源码 / 仓库
- `get_doc.py` 获取产品架构 / 需求 / 方案文档
- 工单只读 API（`owner_order_snapshot`、`meeting-summary`）查看历史
- `search_memory` / `add_memory` 同步个人记忆与团队记忆

服务地址与目录约定见 **§0 四、系统信息**；**不得臆造**未在 §0 出现的 URL 或路径。

### 3.5 对用户汇报

- 不暴露内部多轮扯皮；进展（启动了谁）与结论（最终方案）分层呈现。
- 需要人工填写表单的三种场景（**强约束**）：

  | 场景 | `kind` | 推荐方式 |
  |------|--------|----------|
  | 会议期间澄清 / 选项收集 | `interactive` | **首选** `submit_hitl_questionnaire` 工具；兼容 ask-user 标记块 |
  | 节点终稿确认（`human_confirm: true`） | `result_confirm` | **必须** `submit_hitl_questionnaire(kind="result_confirm")`，`summary` 仅写本节点待确认简表（见 §3.5.2） |
  | 异常 / 风险不可控 / 质量不达标 | `exception` | **必须** `submit_hitl_questionnaire(kind="exception")`，在 `summary` 字段写明异常原因 |

- **调用 `submit_hitl_questionnaire` 后立即停止**：不要再继续写正文、不要重复总结、不要再调任何工具。系统在工具返回后会自动锁定 `human_intervention`，模型继续产出的内容会被忽略。
- **`human_confirm: false` 时**：自主收敛并输出最终结论，由系统自动归档推进；除非进入异常，否则**不要**调用 HITL 工具。

#### 3.5.1 问卷题目颗粒度（强约束 · 易错点）

| 违规做法 | 正确做法 |
|----------|---------|
| ❌ 把 N 个待确认点合并成一道「整体确认 / 部分修改 / 拒绝」单选 | ✅ **每个独立可决策点都要一道独立题**（N 个问题 = N 道独立题） |
| ❌ 只挑「自己拿不定主意」的题目让人选 | ✅ 即使你已经给出推荐默认值，**仍要把每个决策点列为一道题**，把默认值放进选项里（标 ✅ 推荐） |
| ❌ 在 `summary` 里列 14 个决策点，但 `questions` 只放 2 题 | ✅ `questions.length` 必须 **≥** 待确认决策点数量，与 `summary` / 交付文档中的清单一一对应 |

**判定原则**：交付文档 / `result.md` / Worker 产出中每条「带可选项的决策点」「带『可默认结论 X / 是否同意』的问题」，都必须落到 `questions[]` 里成为一道独立题，**不允许打包**。题量较多（>10）时可使用 `render.layout="stepped"` 让前端分步引导，但 `questions` 数组本身必须把每个决策点拆开。

#### 3.5.2 `summary` 字段（待确认总结 · 强约束）

`submit_hitl_questionnaire` 的 `summary` 会渲染为桌面端表单上方的**「待确认总结」**卡片。它**只**用于帮助用户快速扫一眼「本节点要确认什么」，**不是**交付结论全文，**不是**项目路线图，**不是** SOP 流程预告。

| 禁止写入 `summary` | 说明 |
|--------------------|------|
| ❌ `### 下一步`、`确认后 → …`、`进入某某阶段` | 用户提交问卷后由系统归档并推进；**无需**在 summary 里写「确认后去哪」 |
| ❌ Worker 归档里的 **Phase 1～N**、改造路线图、排期表、可行性计划 | 这些属于交付文档正文；用户通过 `questions` 逐题确认，不要抄进 summary |
| ❌ 把 SOP **下一节点**名写进 summary 当流程预告 | 下一节点以 §0 一、(1) 与编排器为准 |
| ❌ 整段复制交付结论的「下一步行动」章节 | 只保留与 `questions[]` **题号一一对应**的待确认简表 |

**`summary` 建议结构（宜短，约一屏内）**：

1. 本节点名 + 工单/产品一行概要（可选）
2. 本节点已产出文件列表（可选，文件名即可）
3. **待确认简表**：列与 `questions` 相同的编号（如 Q1～Q14），每行「维度 / 要点 / 推荐默认（✅）」

> **严禁**：跳过 SOP 节点依赖；在未做检查的情况下把 Worker 的结果当作最终结论；把简单文件读 / 计算这类小事再 delegate 出去；在结果确认 / 异常门控应触发时只口头宣称「问卷已提交」而不调用工具；在结果确认门控开启时自行写入归档或推进节点；在异常场景下私下「假装通过」。

---

## 4. 协作智能体（Worker）的协作规范

> 仅对 `{ROLE}=worker` 生效。

### 4.1 自给自足的输入

你看不到主会话的历史。所有需要的上下文都在小鲸（或上一个 Worker）发给你的 prompt 中。如果信息不足，**主动反问**或使用工具自查，**不要臆造**。

### 4.2 守住能力边界

你的角色、技能与主张已在 system prompt 上方「你的能力档案」段明确给出。若小鲸下发的任务超出你的能力边界，**坦诚向小鲸说明**并建议「请考虑改派更合适的同事」，**不要勉强执行也不要伪造结果**；具体改派谁由小鲸决定（你看不到其他同事的卡片）。

### 4.3 结论必须可校验

涉及代码 / 接口 / 模块名等结论必须给出源码或文档证据；无法验证的项标注 `[待代码确认]`，禁止虚构。

### 4.4 结构化产出

- 输出 Markdown，开头一级标题（`# ...`），结尾包含「结论」「完成」或「交付」。
- 长度建议 ≥ 80 字符；必要时按 §5 的产物要求填充。

### 4.5 闭环反馈

完成后明确告诉小鲸：

- 完成了什么子任务
- 用到了哪些证据
- 还有哪些 `[待代码确认]` / 风险项尚未解决
- 是否触达能力边界、是否建议改派

---

## 5. 输出物与人机交互要求

| 项 | 要求 |
|----|------|
| 归档位置 | `archive/{STAGE_ID}/{NODE_ID}/` 下的 Markdown / JSON 等结构化文件 |
| 命名 | `result.md`（默认），多产物时用语义化文件名 |
| 一级标题 | 必含，描述节点产物（如 `# 需求澄清`） |
| 验收字样 | 包含「结论」「完成」或「交付」之一，便于 `validation.py` 校验 |
| 人工确认 | 见 §1.2：期间交互 + 结果确认 + 异常介入 |
| 用户可见性 | 仅最终结论与必要进展对用户可见；Worker 之间的扯皮、调试日志归档不外发 |

**异常介入**（与 `human_confirm` 无关）：协作超时、产物质量/真实度无法达标、风险不可控时，**必须**调用 `submit_hitl_questionnaire(kind="exception", summary="异常原因…")`；系统会立刻进入 `human_intervention` 并渲染表单；**严禁**只口头宣称问卷已提交而不实际调用工具。

---

## 6. 不变量（Invariants）

1. **会议室 = SOP 节点**：当前节点以外的产物不要写入本次归档（节点 id 见 §0 一、(1)）。
2. **能力边界先行**：小鲸分派前必须先读 system prompt 上方「参会能力卡片」；Worker 接到任务后必须先比对 system prompt 上方「你的能力档案」，超界即向小鲸申请改派。
3. **真实可核验**：任何结论必须能从源码、文档、工单中找到证据。
4. **小鲸主持**：所有 Worker 的产出最终由小鲸综合、校验后才算节点完成。
5. **双端点解耦**：小鲸（host）端点与 Worker 端点独立配置，互不污染。
6. **结果确认先于归档**：`human_confirm: true` 时，用户表单确认是写入归档与推进节点的**前置条件**（仅阻塞当前节点结束，不依赖下一节点类型）。
7. **异常必介入**：异常场景下必须请求人工，不受 `human_confirm` 开关限制。

> 违反任一不变量视为节点未完成，归档校验会拒绝该产物。
"""


# ─── 数据结构 ───────────────────────────────────────────────────────────


@dataclass
class MeetingRoomContext:
    """会议室运行时上下文（用于装配 system prompt）。"""

    role: Role
    scope_type: str
    scope_id: str
    ticket_title: str
    node_id: str
    node_name: str
    node_intent: str
    stage_id: int
    stage_name: str
    host_profile_id: str
    host_profile_name: str
    host_llm_endpoint: str
    worker_llm_endpoint: str
    worker_profile_ids: list[str]
    archive_dir: str
    prompt_supplement: str = ""
    self_profile_id: str = ""

    def template_vars(self) -> dict[str, str]:
        """仅流程/路径类占位符；议程与工单数据只在 ``DYNAMIC_MEETING_CONTEXT``。"""
        return {
            "ROLE": self.role,
            "HOST_PROFILE_ID": self.host_profile_id,
            "HOST_PROFILE_NAME": self.host_profile_name,
            "HOST_LLM_ENDPOINT": self.host_llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY,
            "WORKER_LLM_ENDPOINT": self.worker_llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY,
            "ARCHIVE_DIR": self.archive_dir,
            "STAGE_ID": str(self.stage_id),
            "NODE_ID": self.node_id,
            "DYNAMIC_MEETING_CONTEXT": "{DYNAMIC_MEETING_CONTEXT}",
        }


# ─── 能力卡片 ───────────────────────────────────────────────────────────


def resolve_agent_profile(profile_id: str) -> AgentProfile | None:
    """解析参会智能体 Profile（供 dynamic_prompt 等模块使用）。"""
    return _resolve_profile(profile_id)


def _resolve_profile(profile_id: str) -> AgentProfile | None:
    pid = (profile_id or "").strip()
    if not pid:
        return None
    try:
        store = get_profile_store()
        p = store.get(pid)
        if p is not None:
            return p
    except Exception as exc:
        logger.debug("get_profile_store failed for %s: %s", pid, exc)
    try:
        from synapse.agents.presets import SYSTEM_PRESETS

        for sp in SYSTEM_PRESETS:
            if sp.id == pid:
                return sp
    except Exception:
        return None
    return None


_SKILL_LABEL_CACHE: dict[str, str | None] = {}


def _normalize_skill_id(skill_ref: str) -> str:
    norm = str(skill_ref).strip()
    if not norm:
        return ""
    return norm.split("@", 1)[-1] if "@" in norm else norm


def resolve_skill_label(skill_id: str) -> str | None:
    """从 SKILL.md frontmatter 读取 ``label``（与 Setup Center 展示一致）。"""
    sid = _normalize_skill_id(skill_id)
    if not sid:
        return None
    if sid in _SKILL_LABEL_CACHE:
        return _SKILL_LABEL_CACHE[sid]
    label: str | None = None
    path = _find_external_skill_file(sid)
    if path is not None:
        try:
            from synapse.skills.parser import skill_parser

            parsed = skill_parser.parse_file(path)
            raw = parsed.metadata.label
            if raw and str(raw).strip():
                label = str(raw).strip()
        except Exception as exc:
            logger.debug("resolve skill label %s failed: %s", sid, exc)
    _SKILL_LABEL_CACHE[sid] = label
    return label


def format_skill_entry(skill_ref: str) -> str:
    """展示用：``skill_id（label）``；无 label 时仅 id。"""
    sid = _normalize_skill_id(skill_ref)
    if not sid:
        return ""
    label = resolve_skill_label(sid)
    if label:
        return f"{sid}（{label}）"
    return sid


def format_skill_entries(skills: Iterable[str], *, limit: int = 0) -> list[str]:
    out: list[str] = []
    for s in skills:
        entry = format_skill_entry(str(s))
        if not entry:
            continue
        out.append(entry)
        if limit and len(out) >= limit:
            break
    return out


def _short_skill_names(skills: Iterable[str], limit: int = 6) -> list[str]:
    """兼容旧调用：仅返回 skill id（不含 label）。"""
    out: list[str] = []
    for s in skills:
        sid = _normalize_skill_id(str(s))
        if not sid:
            continue
        out.append(sid)
        if len(out) >= limit:
            break
    return out


def _format_capability_card(
    profile: AgentProfile,
    *,
    role: str,
    llm_endpoint: str,
) -> str:
    name = profile.get_display_name() or profile.name or profile.id
    skills = format_skill_entries(profile.skills or [], limit=6)
    desc = (profile.description or "").strip()
    custom = (profile.custom_prompt or "").strip()

    lines: list[str] = []
    lines.append(f"## {name} (`{profile.id}`)")
    lines.append(f"- 角色：{role} · 端点：`{llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY}`")
    if desc:
        lines.append(f"- 简介：{desc}")
    if skills:
        lines.append(f"- 核心技能：{', '.join(skills)}")
    if custom:
        short = re.sub(r"\s+", " ", custom).strip()
        if len(short) > 160:
            short = short[:160] + "…"
        lines.append(f"- 主张：{short}")
    return "\n".join(lines)


def _format_self_capability_block(
    profile: AgentProfile | None,
    *,
    fallback_id: str,
    llm_endpoint: str,
) -> str:
    """渲染 Worker 视角下「你的能力档案」段：用第一人称语气强化身份与边界。

    与 `_format_capability_card` 的区别：
    - 不显示"角色：worker"（已在顶部"当前角色"中说明）
    - 主张不截断，完整展示其 custom_prompt
    - 若 profile 找不到则给出兜底身份说明
    """
    if profile is None:
        return (
            f"- **智能体 ID**：`{fallback_id or '(unknown)'}`\n"
            f"- **使用端点**：`{llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY}`\n"
            "- **简介**：未在 Profile 库中找到你的档案，请按通用研发协作者身份执行；遇到不确定时主动反问小鲸。"
        )

    name = profile.get_display_name() or profile.name or profile.id
    skills = format_skill_entries(profile.skills or [], limit=12)
    desc = (profile.description or "").strip()
    custom = (profile.custom_prompt or "").strip()

    lines: list[str] = []
    lines.append(f"- **身份**：{name}（`{profile.id}`）")
    lines.append(f"- **使用端点**：`{llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY}`")
    if desc:
        lines.append(f"- **简介**：{desc}")
    if skills:
        lines.append(f"- **你具备的技能**（仅在这些范围内执行任务）：")
        for s in skills:
            lines.append(f"  - {s}")
    if custom:
        lines.append("- **角色主张 / 工作风格**：")
        for line in custom.splitlines():
            t = line.rstrip()
            if t:
                lines.append(f"  > {t}")
    return "\n".join(lines)


def build_capability_cards(
    *,
    host_profile_id: str,
    worker_profile_ids: list[str],
    host_llm_endpoint: str,
    worker_llm_endpoint: str,
    exclude_self_id: str | None = None,
    include_host: bool = True,
) -> str:
    """渲染参会智能体能力卡片清单。

    - `exclude_self_id`: 排除「自己」的 worker 卡片，避免自我介绍冗余。
    - `include_host`: 是否渲染 host 卡片。host 视角下应传 ``False``（自己就是小鲸，
      无需再看自己的卡片）；worker 视角下保留 host 卡片，便于明确主持人身份。
    """
    cards: list[str] = []

    if include_host and (not exclude_self_id or exclude_self_id != host_profile_id):
        host_profile = _resolve_profile(host_profile_id)
        if host_profile is not None:
            cards.append(_format_capability_card(host_profile, role="host", llm_endpoint=host_llm_endpoint))

    for wid in worker_profile_ids or []:
        wid = str(wid).strip()
        if not wid or wid == host_profile_id:
            continue
        if exclude_self_id and wid == exclude_self_id:
            continue
        wp = _resolve_profile(wid)
        if wp is None:
            cards.append(
                f"## {wid}\n- 角色：worker · 端点：`{worker_llm_endpoint or DEFAULT_LLM_ENDPOINT_KEY}`\n"
                "- 简介：未在 Profile 库中找到，使用兜底身份。"
            )
            continue
        cards.append(
            _format_capability_card(
                wp,
                role="worker",
                llm_endpoint=worker_llm_endpoint,
            )
        )

    if not cards:
        return "（除你之外暂无其他参会智能体；如需协作请在『系统智能体管理』中配置。）"

    return "\n\n".join(cards)


# ─── 角色裁剪 + 渲染 ────────────────────────────────────────────────────


_HOST_HIDE_SECTION = re.compile(
    r"^## 4\. 协作智能体（Worker）的协作规范.*?(?=^## 5\. )",
    re.MULTILINE | re.DOTALL,
)
_WORKER_HIDE_SECTION = re.compile(
    r"^## 3\. 小鲸（Host）的工作循环.*?(?=^## 4\. )",
    re.MULTILINE | re.DOTALL,
)


def trim_skill_for_role(skill_body: str, role: Role) -> str:
    """按角色裁剪通用规范正文：host 隐藏 Worker 视角，worker 隐藏 Host 视角。"""
    if role == "host":
        return _HOST_HIDE_SECTION.sub("", skill_body)
    if role == "worker":
        return _WORKER_HIDE_SECTION.sub("", skill_body)
    return skill_body


def render_skill(skill_body: str, variables: dict[str, str]) -> str:
    """填充规范正文中的占位符；``DYNAMIC_MEETING_CONTEXT`` 最后注入，避免污染四段式正文。"""
    dynamic = variables.get("DYNAMIC_MEETING_CONTEXT")
    procedural = {k: v for k, v in variables.items() if k != "DYNAMIC_MEETING_CONTEXT"}
    rendered = skill_body
    for key, value in procedural.items():
        rendered = rendered.replace("{" + key + "}", str(value))
    if dynamic is not None:
        rendered = rendered.replace("{DYNAMIC_MEETING_CONTEXT}", str(dynamic), 1)
    return rendered


def _extract_product_label(init_context: dict[str, Any] | None) -> str:
    """从 init_context 中提取『涉及产品』展示值。"""
    if not isinstance(init_context, dict):
        return "（未识别产品）"
    product = init_context.get("product")
    if not isinstance(product, dict):
        return "（未识别产品）"
    prod = str(product.get("prod") or "").strip()
    version = str(product.get("version") or "").strip()
    name = str(product.get("name") or product.get("product_name") or "").strip()
    suffix = f"@{version}" if version else ""
    if name and prod:
        return f"{name}（prod=`{prod}`{suffix}）"
    if prod:
        return f"`{prod}`{suffix}"
    if name:
        return name
    return "（未识别产品）"


def _human_confirm_label(binding: dict[str, Any] | None) -> str:
    if not isinstance(binding, dict):
        return "未配置"
    if binding.get("human_confirm"):
        return "**开启**（结果需用户表单确认后才能归档/推进）"
    return "关闭（自主收敛后自动归档推进）"

def build_meeting_runtime_header(
    context: MeetingRoomContext,
    *,
    now_iso: str | None = None,
    binding: dict[str, Any] | None = None,
    init_context: dict[str, Any] | None = None,
) -> str:
    """生成"运行时头"——替代原 Identity / Catalogs / Multi-Agent 段。

    Host 与 Worker 各加一段角色专属说明；末尾附参会能力卡片。
    无论 host 还是 worker，能力卡片都会**排除自己**，避免自我介绍冗余。
    """
    from datetime import datetime as _dt

    role = context.role
    self_pid = (context.self_profile_id or "").strip()
    if not self_pid:
        if role == "host":
            self_pid = context.host_profile_id
        elif context.worker_profile_ids:
            self_pid = context.worker_profile_ids[0]

    role_label = "小鲸主持人" if role == "host" else "协作专家"
    now = (now_iso or _dt.now().isoformat(timespec="seconds")).strip()
    product_label = _extract_product_label(init_context)
    confirm_label = _human_confirm_label(binding)

    lines: list[str] = []
    lines.append("# 你是 Synapse 研发会议室参会智能体")
    lines.append("")
    lines.append(f"- **当前角色**：{role_label}")
    lines.append(f"- **会议工单**:[`{context.scope_id}`]-{context.ticket_title}")
    lines.append(f"- **工单描述**：")
    lines.append(f"- **涉及产品**：{product_label}")
    lines.append(f"- **会议任务**：{context.stage_name}阶段的{context.node_name}任务")
    lines.append(f"- **会议目标**：{context.node_intent}")
    lines.append(f"- **人工确认**：{confirm_label}")
    lines.append(f"- **当前时间**：{now}")
    lines.append("- **回复语言**：中文")
    lines.append("")

    if role == "host":
        lines.append("## 主持人职责")
        lines.append("- 必须熟悉本工单对应的产品信息（产品文档 / 仓库代码 / 历史工单），所有决策都要基于产品事实；缺少产品事实时可以拒绝或报错，**不得臆造**。")
        lines.append("- 获取产品信息事实的工作**优先委派**给协作智能体；当且仅当现有 worker 不具备某项能力时，才自行调用工具/技能收集。")
        lines.append("- 基于产品事实，**专注于上方「会议目标」中要做的具体事情**，不进行超出本节点目标的决策。")
        lines.append("- 通过 `submit_meeting_work_plan` 提交结构化计划后，再调用 `delegate_to_agent` 或 `delegate_parallel` 派单；委派后等待 worker 返回再继续。")
        lines.append("- 收到 worker 产出后，按「契合度 / 真实性 / 准确性」三项逐条校验；不通过则**重新派单**给同一 worker 并指出缺项。")
        lines.append("- 节点目标完成且通过自检后，按下方规范第 5 节要求归档（`archive/{STAGE_ID}/{NODE_ID}/`）并报告结论。")
        lines.append("- `human_confirm` 开启或出现异常 / 风险不可控时，必须调用 `submit_hitl_questionnaire`，**禁止伪造用户答复**，**禁止只口头宣称问卷已提交**。")
        lines.append("- 可用 worker 名单与能力边界见下方「参会能力卡片」（已排除你自己）。")
    else:
        lines.append("## 协作专家职责")
        lines.append("- 必须熟悉本工单对应的产品信息（产品文档 / 仓库代码 / 历史工单），所有决策都要基于产品事实；缺少产品事实时可以拒绝或报错，**不得臆造**。")
        lines.append("- 你是子 Agent，**禁止再发起委派**（不要调用 delegate_to_agent / delegate_parallel），也无法直接联系其他 Worker；任何「需要别人配合」的诉求都改为在产出里向小鲸说明。")
        lines.append("- 仅在「你的能力档案」描述的能力边界内执行任务；超出边界时**坦诚向小鲸说明**并建议改派，不要勉强执行、不要伪造结果。")
        lines.append("- 输出必须自给自足：含结论、证据、产物路径；详见下方规范第 4 节「Worker 协作规范」。")
        lines.append("- 你看不到主会话历史，也看不到其他 Worker 的能力卡片；小鲸已在 prompt 中给了你执行所需的全部上下文，信息不足时主动反问。")

    lines.append("")
    lines.append("## 工具调用通则")
    lines.append("- 你拥有 shell / read_file / write_file / list_directory / web_search 等工具，通过函数调用方式触发，禁止伪造工具输出。")
    lines.append("- 涉及破坏性操作（rm / 大批量写入 / 网络副作用）需在产物中显式标注理由。")
    lines.append("- 任何结论必须可由源码、文档或工单证据回溯；严禁虚构。")
    lines.append("")

    if role == "host":
        cards = build_capability_cards(
            host_profile_id=context.host_profile_id,
            worker_profile_ids=context.worker_profile_ids,
            host_llm_endpoint=context.host_llm_endpoint,
            worker_llm_endpoint=context.worker_llm_endpoint,
            exclude_self_id=self_pid or None,
            include_host=False,
        )
        lines.append("## 参会能力卡片")
        lines.append("")
        lines.append("以下是本场会议可用的协作智能体（不含你自己），分派任务时必须先比对其能力边界：")
        lines.append("")
        lines.append(cards)
    else:
        self_profile = _resolve_profile(self_pid) if self_pid else None
        self_block = _format_self_capability_block(
            self_profile,
            fallback_id=self_pid,
            llm_endpoint=context.worker_llm_endpoint,
        )
        lines.append("## 你的能力档案")
        lines.append("")
        lines.append("这是小鲸在本节点为你配置的角色档案——所有任务都必须在此边界内执行；超界即向小鲸申请改派，不要勉强或臆造。")
        lines.append("")
        lines.append(self_block)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("（以下为会议室通用规范，本场会议必须严格遵守。）")
    lines.append("")
    return "\n".join(lines)


def build_room_skill_prompt(
    context: MeetingRoomContext,
    *,
    skill_body: str | None = None,
    init_context: dict[str, Any] | None = None,
    binding: dict[str, Any] | None = None,
    sop_node_display: str = "",
) -> str:
    """生成会议室完整 system prompt：运行时头 + 通用规范 + 四段式 ``{DYNAMIC_MEETING_CONTEXT}``。

    `skill_body` 仅供测试/缓存等场景覆盖；正常调用走内置 `_MEETING_ROOM_RULES`。
    """
    from synapse.rd_meeting.dynamic_prompt import build_dynamic_meeting_context

    body = skill_body if skill_body is not None else get_meeting_room_rules()
    body = trim_skill_for_role(body, context.role)

    bind = dict(binding) if binding else {
        "node_id": context.node_id,
        "node_name": context.node_name,
        "stage_id": context.stage_id,
        "stage_name": context.stage_name,
        "node_intent": context.node_intent,
        "host_profile_id": context.host_profile_id,
        "worker_profile_ids": context.worker_profile_ids,
        "host_llm_endpoint_key": context.host_llm_endpoint,
        "worker_llm_endpoint_key": context.worker_llm_endpoint,
        "prompt_supplement": context.prompt_supplement,
        "human_confirm": False,
    }

    dynamic = build_dynamic_meeting_context(
        binding=bind,
        init_data=init_context,
        scope_type=context.scope_type,  # type: ignore[arg-type]
        scope_id=context.scope_id,
        sop_node_display=sop_node_display or context.node_name,
    )

    variables = context.template_vars()
    variables["DYNAMIC_MEETING_CONTEXT"] = dynamic
    rendered = render_skill(body, variables)
    header = build_meeting_runtime_header(
        context,
        binding=bind,
        init_context=init_context,
    )
    return f"{header}\n{rendered}"


def _self_profile_id_for_context(context: MeetingRoomContext) -> str | None:
    """Worker 视角时，从 worker_profile_ids 推断当前 Worker 的 profile id。

    Phase 当前默认把 worker_profile_ids[0] 作为自己；后续 host 通过 delegate
    工具进入时会有独立 instance_key，再由调用方覆盖。
    """
    if context.role == "worker" and context.worker_profile_ids:
        first = str(context.worker_profile_ids[0]).strip()
        return first or None
    return None


def make_context(
    *,
    role: Role,
    binding: dict[str, Any],
    scope_type: str,
    scope_id: str,
    ticket_title: str,
    archive_dir: str,
    self_profile_id: str = "",
) -> MeetingRoomContext:
    """从 binding（resolve_node_binding 输出）+ scope 信息组装上下文。"""
    host_id = str(binding.get("host_profile_id") or "default").strip() or "default"
    host_profile = _resolve_profile(host_id)
    host_name = (
        host_profile.get_display_name() if host_profile else host_id
    )

    worker_ids = list(binding.get("worker_profile_ids") or [])

    return MeetingRoomContext(
        role=role,
        scope_type=str(scope_type or "demand"),
        scope_id=str(scope_id or ""),
        ticket_title=str(ticket_title or ""),
        node_id=str(binding.get("node_id") or "pending"),
        node_name=str(binding.get("node_name") or node_display_name(str(binding.get("node_id") or ""))),
        node_intent=str(binding.get("node_intent") or binding.get("intent") or ""),
        stage_id=int(binding.get("stage_id") or 0),
        stage_name=str(binding.get("stage_name") or stage_name_for_id(int(binding.get("stage_id") or 0))),
        host_profile_id=host_id,
        host_profile_name=str(host_name),
        host_llm_endpoint=str(binding.get("host_llm_endpoint_key") or DEFAULT_LLM_ENDPOINT_KEY),
        worker_llm_endpoint=str(binding.get("worker_llm_endpoint_key") or DEFAULT_LLM_ENDPOINT_KEY),
        worker_profile_ids=[str(w) for w in worker_ids if str(w).strip()],
        archive_dir=str(archive_dir or ""),
        prompt_supplement=str(binding.get("prompt_supplement") or ""),
        self_profile_id=str(self_profile_id or "").strip(),
    )


