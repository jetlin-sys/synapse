"""
研发代码开发端到端流程验证

流程：
  [1/4] 检查目录（代码目录、技能脚本路径）
  [2/4] 检查函数级方案文档
  [3/4] 启动主智能体（小鲸）并分配子智能体
  [4/4] 主智能体携带环境信息委派子智能体（浩鲸产品研发专家），按 Profile 技能开发

智能体池化、工具裁剪、技能预注入对齐 src/synapse/rd_meeting（agent_runtime / agent_session / participants）。
协作子智能体与会议室一致：Profile `whalecloud-rd-expert`（需在智能体管理中挂载 whalecloud-dev-tool-development）。
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass
from pathlib import Path

# 仓库根目录加入 PYTHONPATH（test_dev 非安装包）
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from synapse.agents.orchestrator import AgentOrchestrator
from synapse.agents.profile import AgentProfile, SkillsMode, get_profile_store
from synapse.rd_meeting.agent_runtime import (
    apply_meeting_agent_runtime,
    apply_meeting_slim_tools,
    skill_ids_from_profile,
)
from synapse.rd_meeting.agent_session import bind_meeting_agent_session, ensure_host_session
from synapse.rd_meeting.participants import resolve_profile_display_name
from synapse.rd_sop.manifest import DEFAULT_HOST_PROFILE_ID
from synapse.sessions.session import Session, SessionConfig, SessionContext, SessionState

# ── 工作区路径（与 skills/whalecloud-dev-tool-development SKILL.md 一致）──
TASK_ID = "21881453"
WORK_DIR = Path("C:/Users/jetlin/.synapse/work") / TASK_ID
CODE_PATH = WORK_DIR / "code/ZMDB/BackServiceCpp/src/cpp/Zmdb"
DOC_DIR = WORK_DIR / "archive/需求设计/func_solution"
FUNC_SOLUTION_DOC = DOC_DIR / "函数级方案.md"
OUTPUT_DIR = WORK_DIR / "archive/需求研发"
ARTIFACTS_DIR = WORK_DIR / "artifacts"
SCRIPT_PATH = (
    _REPO_ROOT / "skills" / "whalecloud-dev-tool-development" / "scripts" / "cursor-operation.py"
)

HOST_PROFILE_ID = DEFAULT_HOST_PROFILE_ID  # 小鲸
DEV_WORKER_PROFILE_ID = "whalecloud-rd-expert"  # 浩鲸产品研发专家（与会议室协作智能体一致）
DEV_SKILL_ID = "whalecloud-dev-tool-development"
ROOM_ID = TASK_ID

_WORKER_EXECUTION_RULES = """
## 执行硬性规则（代码开发子任务）

1. **必须**先 `get_skill_info("whalecloud-dev-tool-development")`，再 `run_skill_script` 调用 `scripts/cursor-operation.py`（参数 `--code-path` 等见 SKILL）。
2. **禁止**用 `python -c` 读方案或扫目录；读方案用 `read_file`，看目录用 `list_directory`。
3. **禁止**对 `OUTPUT_DIR` 调用 `read_file`（其为目录）。
4. **禁止**向用户索要 A/B/C 选项；未完成时说明阻塞，完成时给出 manifest / patch 路径。
5. 不要用 `create_todo` + 反复 `run_shell` 代替技能脚本执行 Cursor 开发。
"""


def _bootstrap_synapse_paths() -> None:
    """确保从仓库根扫描 skills/，且 data 目录指向 openakita（非 test_dev 孤立目录）。"""
    os.chdir(_REPO_ROOT)
    os.environ.setdefault("SYNAPSE_ROOT", str(_REPO_ROOT))
    try:
        from synapse.config import settings

        settings.project_root = _REPO_ROOT
    except Exception:
        pass


@dataclass(frozen=True)
class DevFlowEnv:
    task_id: str
    work_dir: Path
    code_path: Path
    func_solution_doc: Path
    output_dir: Path
    artifacts_dir: Path
    script_path: Path


def _build_env() -> DevFlowEnv:
    return DevFlowEnv(
        task_id=TASK_ID,
        work_dir=WORK_DIR,
        code_path=CODE_PATH,
        func_solution_doc=FUNC_SOLUTION_DOC,
        output_dir=OUTPUT_DIR,
        artifacts_dir=ARTIFACTS_DIR,
        script_path=SCRIPT_PATH,
    )


def _check_paths(env: DevFlowEnv) -> list[str]:
    """返回错误列表；空表示通过。"""
    errors: list[str] = []
    if not env.work_dir.is_dir():
        errors.append(f"工作目录不存在: {env.work_dir}")
    if not env.code_path.is_dir():
        errors.append(f"代码目录不存在: {env.code_path}")
    if not env.script_path.is_file():
        errors.append(f"技能脚本不存在: {env.script_path}")
    return errors


def _ensure_worker_profile() -> AgentProfile:
    """加载浩鲸产品研发专家 Profile；若缺少开发技能则自动并入 skills 列表。"""
    store = get_profile_store()
    profile = store.get(DEV_WORKER_PROFILE_ID)
    if profile is None:
        from synapse.agents.presets import SYSTEM_PRESETS

        for preset in SYSTEM_PRESETS:
            if preset.id == DEV_WORKER_PROFILE_ID:
                store.save(preset)
                profile = preset
                break
    if profile is None:
        raise RuntimeError(
            f"协作智能体 Profile 不存在: {DEV_WORKER_PROFILE_ID}。"
            "请在 Synapse 智能体管理中确认「浩鲸产品研发专家」已部署，"
            f"并挂载技能 {DEV_SKILL_ID}。"
        )

    skills = list(profile.skills or [])
    if DEV_SKILL_ID not in skills:
        skills.append(DEV_SKILL_ID)
        profile.skills = skills
        profile.skills_mode = SkillsMode.INCLUSIVE
        store.save(profile)
    return profile


def _build_host_system_prompt(env: DevFlowEnv) -> str:
    """主智能体（小鲸）系统提示：环境信息 + 委派职责（对齐会议室 Host 派单语义）。"""
    worker_label = resolve_profile_display_name(DEV_WORKER_PROFILE_ID)
    return f"""# 研发代码开发 — 主控智能体（小鲸）

你是 Synapse 研发任务主控智能体，负责把代码开发任务委派给协作子智能体并汇总结果。

## 环境信息

| 参数 | 路径 |
|------|------|
| WORK_DIR | `{env.work_dir}` |
| FUNC_SOLUTION_DOC | `{env.func_solution_doc}` |
| CODE_PATH | `{env.code_path}` |
| OUTPUT_DIR | `{env.output_dir}` |
| 技能脚本 | `{env.script_path}` |

## 协作阵容

- 主控（你）：{resolve_profile_display_name(HOST_PROFILE_ID)}（`{HOST_PROFILE_ID}`）
- 子智能体：{worker_label}（`{DEV_WORKER_PROFILE_ID}`），已绑定技能 `{DEV_SKILL_ID}`

## 你的职责

1. 理解上述环境路径，不要臆造目录。
2. 使用 `delegate_to_agent` 将代码开发任务委派给 `{DEV_WORKER_PROFILE_ID}`。
3. 委派 message 中须写明：根据函数级方案文档完成代码开发，并传递 WORK_DIR / 文档 / 代码 / 产物路径。
4. 子智能体返回后，简要汇总是否完成、产物路径与异常（如有）。

**禁止**自行用 shell 直接改业务代码；开发工作由子智能体通过 `{DEV_SKILL_ID}` 技能完成。
"""


def _build_host_user_turn(env: DevFlowEnv) -> str:
    """主智能体首轮 user 消息。"""
    return (
        f"请立即委派子智能体 `{DEV_WORKER_PROFILE_ID}`，"
        f"根据函数级方案文档 `{env.func_solution_doc}` 在代码目录 `{env.code_path}` "
        f"完成代码开发，产物输出到 `{env.output_dir}`。\n\n"
        f"WORK_DIR={env.work_dir}"
    )


def _build_worker_delegation_message(env: DevFlowEnv) -> str:
    """主→子委派任务正文（与 delegate_to_agent message 一致）。"""
    return f"""【代码开发子任务】

请使用技能 **{DEV_SKILL_ID}** 完成以下开发：

1. 调用 `get_skill_info("{DEV_SKILL_ID}")` 阅读完整 SKILL.md
2. 阅读函数级方案：`{env.func_solution_doc}`（`read_file`）
3. **必须** `run_skill_script` 执行 `scripts/cursor-operation.py`，示例参数：
   - `--code-path` = `{env.code_path}`
   - `--doc` = `{env.func_solution_doc}`
   - `--target` = 根据函数级方案实现代码修改
4. 产物写入 `{env.output_dir}`（含 diff/ 与 `{env.artifacts_dir}/manifest.json`）
   - `{env.output_dir}` 是目录，用 `list_directory` 查看，勿对目录调用 `read_file`

环境参数：
- WORK_DIR=`{env.work_dir}`
- FUNC_SOLUTION_DOC=`{env.func_solution_doc}`
- CODE_PATH=`{env.code_path}`
- OUTPUT_DIR=`{env.output_dir}`

{_WORKER_EXECUTION_RULES}

完成后在回复中说明：执行结果、日志路径、manifest 是否已更新。
"""


def _configure_host_agent(agent: object, env: DevFlowEnv) -> None:
    agent.default_cwd = str(env.work_dir)  # type: ignore[attr-defined]
    shell_tool = getattr(agent, "shell_tool", None)
    if shell_tool is not None:
        try:
            shell_tool.default_cwd = str(env.work_dir)  # type: ignore[union-attr]
        except Exception:
            pass
    store = get_profile_store()
    host_profile = store.get(HOST_PROFILE_ID)
    base = _build_host_system_prompt(env)
    ctx = getattr(agent, "_context", None)
    if ctx is not None:
        ctx.system = apply_meeting_agent_runtime(
            agent,
            role="host",
            profile=host_profile,
            base_system_prompt=base,
        )
    else:
        apply_meeting_slim_tools(agent, role="host")
    try:
        agent._org_context = True  # type: ignore[attr-defined]
    except Exception:
        pass


def _configure_worker_agent(agent: object, env: DevFlowEnv, worker_profile: AgentProfile) -> None:
    agent.default_cwd = str(env.code_path)  # type: ignore[attr-defined]
    shell_tool = getattr(agent, "shell_tool", None)
    if shell_tool is not None:
        try:
            shell_tool.default_cwd = str(env.code_path)  # type: ignore[union-attr]
        except Exception:
            pass
    worker_base = (
        f"# 代码开发子智能体\n\n"
        f"工作目录（WORK_DIR）：`{env.work_dir}`\n"
        f"代码目录（CODE_PATH）：`{env.code_path}`\n"
        f"函数级方案：`{env.func_solution_doc}`\n"
        f"产物目录：`{env.output_dir}`\n\n"
        f"已绑定技能：{', '.join(skill_ids_from_profile(worker_profile)) or DEV_SKILL_ID}\n"
        f"{_WORKER_EXECUTION_RULES}\n"
    )
    ctx = getattr(agent, "_context", None)
    if ctx is not None:
        ctx.system = apply_meeting_agent_runtime(
            agent,
            role="worker",
            profile=worker_profile,
            base_system_prompt=worker_base,
        )
    else:
        apply_meeting_slim_tools(agent, role="worker")
    try:
        agent._org_context = True  # type: ignore[attr-defined]
    except Exception:
        pass


def _verify_skill_registry(agent: object) -> str | None:
    """委派前确认开发技能已加载；未加载时返回错误说明。"""
    loader = getattr(agent, "skill_loader", None)
    if loader is not None and loader.get_skill(DEV_SKILL_ID) is not None:
        return None
    registry = getattr(agent, "skill_registry", None)
    if registry is not None and registry.get(DEV_SKILL_ID) is not None:
        return None
    return (
        f"技能 {DEV_SKILL_ID} 未在注册表中找到。"
        f"请从仓库根目录运行本脚本，并确认存在 {_REPO_ROOT / 'skills' / DEV_SKILL_ID}"
    )


def _verify_delegation_deliverables(env: DevFlowEnv) -> tuple[bool, str]:
    """委派成功须产出 manifest 或 patch（不能仅有文字总结）。"""
    manifest = env.artifacts_dir / "manifest.json"
    if manifest.is_file():
        return True, str(manifest)
    diff_dir = env.output_dir / "diff"
    if diff_dir.is_dir():
        patches = list(diff_dir.glob("*.patch"))
        if patches:
            return True, f"{diff_dir}（{len(patches)} 个 patch）"
    return False, "缺少 artifacts/manifest.json 与 archive/需求研发/diff/*.patch"


async def _prewarm_agents(
    orchestrator: AgentOrchestrator,
    session_id: str,
    env: DevFlowEnv,
    worker_profile: AgentProfile,
) -> tuple[object, object]:
    """预热主/子 Agent 实例（对齐会议室 prewarm：池化 + runtime 配置）。"""
    orchestrator._ensure_deps()
    pool = orchestrator._pool
    assert pool is not None

    host_prof = get_profile_store().get(HOST_PROFILE_ID)
    if host_prof is None:
        raise RuntimeError(f"主智能体 Profile 不存在: {HOST_PROFILE_ID}")

    host_agent = await pool.get_or_create(session_id, host_prof)
    _configure_host_agent(host_agent, env)

    worker_agent = await pool.get_or_create(session_id, worker_profile)
    _configure_worker_agent(worker_agent, env, worker_profile)

    return host_agent, worker_agent


async def _run_host_delegate_flow(
    orchestrator: AgentOrchestrator,
    env: DevFlowEnv,
    *,
    use_llm_host: bool,
) -> str:
    """执行委派：默认由主智能体 LLM 调 delegate；可改为直接 orchestrator.delegate。"""
    session = ensure_host_session(ROOM_ID, HOST_PROFILE_ID)
    session.id = f"dev_flow_{TASK_ID}"  # 非 rd_meeting:*，免会议室 work_plan 门禁
    session.context.agent_profile_id = HOST_PROFILE_ID

    worker_profile = _ensure_worker_profile()
    host_agent, worker_agent = await _prewarm_agents(
        orchestrator, session.id, env, worker_profile
    )

    bind_meeting_agent_session(host_agent, session)

    skill_err = _verify_skill_registry(worker_agent)
    if skill_err:
        raise RuntimeError(skill_err)

    from synapse.tools.handlers.todo_state import (
        clear_session_todo_state,
        require_todo_for_session,
    )

    clear_session_todo_state(session.id)
    require_todo_for_session(session.id, False)

    worker_msg = _build_worker_delegation_message(env)

    if use_llm_host:
        host_agent._is_sub_agent_call = False  # type: ignore[attr-defined]
        user_turn = _build_host_user_turn(env)
        return await orchestrator.handle_message(session, user_turn)

    # 程序化委派（等价于 Host 成功调用 delegate_to_agent）
    return await orchestrator.delegate(
        session,
        from_agent=HOST_PROFILE_ID,
        to_agent=DEV_WORKER_PROFILE_ID,
        message=worker_msg,
        reason="函数级方案代码开发（dev e2e）",
    )


def _should_run_llm() -> bool:
    if os.environ.get("DEV_FLOW_SKIP_LLM", "").strip().lower() in ("1", "true", "yes"):
        return False
    return True


def _use_llm_host() -> bool:
    """DEV_FLOW_LLM_HOST=1 时走主智能体 LLM 自主 delegate；默认直接 orchestrator.delegate。"""
    return os.environ.get("DEV_FLOW_LLM_HOST", "").strip().lower() in ("1", "true", "yes")


async def main() -> bool:
    print("=" * 60)
    print("研发代码开发 — 端到端流程验证")
    print("=" * 60)

    _bootstrap_synapse_paths()
    env = _build_env()

    print("\n[1/4] 检查目录...")
    path_errors = _check_paths(env)
    if path_errors:
        for err in path_errors:
            print(f"  ✗ {err}")
        return False
    print(f"  ✓ 工作目录: {env.work_dir}")
    print(f"  ✓ 代码目录: {env.code_path}")
    print(f"  ✓ 技能脚本: {env.script_path}")

    print("\n[2/4] 检查函数级方案文档...")
    if not env.func_solution_doc.is_file():
        print(f"  ✗ 方案文档不存在: {env.func_solution_doc}")
        return False
    doc_content = env.func_solution_doc.read_text(encoding="utf-8")
    print(f"  ✓ 方案文档已加载 ({len(doc_content)} 字符)")

    env.output_dir.mkdir(parents=True, exist_ok=True)
    env.artifacts_dir.mkdir(parents=True, exist_ok=True)

    print("\n[3/4] 启动主智能体并分配子智能体...")
    try:
        from synapse.agents.presets import ensure_presets_on_mode_enable
        from synapse.config import settings

        ensure_presets_on_mode_enable(settings.data_dir / "agents")
    except Exception as exc:
        print(f"  ⚠ 预置 Profile 部署跳过: {exc}")

    try:
        worker_profile = _ensure_worker_profile()
    except RuntimeError as exc:
        print(f"  ✗ {exc}")
        return False

    host_label = resolve_profile_display_name(HOST_PROFILE_ID)
    worker_label = resolve_profile_display_name(DEV_WORKER_PROFILE_ID)
    print(f"  ✓ 主智能体: {host_label} (`{HOST_PROFILE_ID}`)")
    print(f"  ✓ 子智能体: {worker_label} (`{DEV_WORKER_PROFILE_ID}`)")
    print(f"  ✓ 必需技能: {DEV_SKILL_ID}")
    print(f"    Profile 技能列表: {skill_ids_from_profile(worker_profile)}")

    orchestrator = AgentOrchestrator()

    print("\n[4/4] 主智能体委派子智能体执行代码开发...")
    print("  · 编写主智能体提示词（含环境信息）...")
    print(_build_host_system_prompt(env)[:400] + "\n    ...")

    if not _should_run_llm():
        print("  ⚠ 已跳过 LLM 执行（取消 DEV_FLOW_SKIP_LLM 或设为 0/false 以启用完整委派）")
        print("\n" + "=" * 60)
        print("✓ 环境与子智能体配置验证完成（未调用 LLM）")
        print("=" * 60)
        return True

    mode = "主智能体 LLM 自主委派" if _use_llm_host() else "Orchestrator.delegate（子智能体 LLM）"
    print(f"  · 执行模式: {mode}")

    try:
        result = await _run_host_delegate_flow(
            orchestrator, env, use_llm_host=_use_llm_host()
        )
    except Exception as exc:
        print(f"  ✗ 委派执行失败: {exc}")
        return False

    preview = (result or "").strip()
    if preview.startswith("❌"):
        print(f"  ✗ {preview[:800]}")
        return False

    print(f"  ✓ 委派完成，摘要:\n    {preview[:600]}")
    if len(preview) > 600:
        print(f"    ... ({len(preview) - 600} 字符省略)")

    deliverable_ok, deliverable_detail = _verify_delegation_deliverables(env)
    if deliverable_ok:
        print(f"  ✓ 交付物校验通过: {deliverable_detail}")
    else:
        print(f"  ✗ 委派未产出有效交付物: {deliverable_detail}")
        print("    （仅文字回复不算完成，须 run_skill_script 执行 cursor-operation.py）")
        return False

    print("\n" + "=" * 60)
    print("✓ 端到端流程验证完成")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
