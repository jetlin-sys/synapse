# 研发代码开发端到端测试设计

## 概述

`tests/test_e2e/test_full_flow.py` 验证**主智能体委派子智能体、子智能体通过技能调用 Cursor 开发**的完整链路。

与早期「测试脚本直接 subprocess 调 `cursor-operation.py`」不同，当前实现复用 Synapse 多智能体与研发会议室运行时能力（`AgentOrchestrator`、`apply_meeting_agent_runtime` 等），由子智能体按 `whalecloud-dev-tool-development` 技能自行执行脚本。

## 目录结构

```
C:\Users\jetlin\.synapse\work\21881453\          # WORK_DIR
├── archive/
│   ├── 需求设计/func_solution/
│   │   └── 函数级方案.md                        # FUNC_SOLUTION_DOC（输入）
│   └── 需求研发/                                # OUTPUT_DIR
│       ├── diff/                                # Patch 输出
│       └── （由技能写入 artifacts 等）
├── artifacts/
│   └── manifest.json                            # 产物清单（子智能体开发完成后生成）
└── code/ZMDB/BackServiceCpp/src/cpp/Zmdb/       # CODE_PATH（Cursor 改码目录）

openakita/skills/whalecloud-dev-tool-development/
└── scripts/cursor-operation.py                  # 技能脚本（[1/4] 校验存在性）
```

## 测试流程（四步）

```
┌──────────────────────────────────────────────────────────────────┐
│  test_full_flow.py                                               │
│                                                                  │
│  [1/4] 检查目录                                                   │
│        WORK_DIR、CODE_PATH、cursor-operation.py 必须存在          │
│                                                                  │
│  [2/4] 检查函数级方案文档                                         │
│        FUNC_SOLUTION_DOC 存在并加载                               │
│        顺带创建 OUTPUT_DIR、artifacts/ 目录                       │
│                                                                  │
│  [3/4] 启动主智能体并分配子智能体                                 │
│        Host: default（会议室主控 / 小鲸角色）                     │
│        Worker: whalecloud-rd-expert（浩鲸产品研发专家）           │
│        技能来自 Profile（含 whalecloud-dev-tool-development 等）  │
│        池化预热 + 工具裁剪 + 技能摘要注入（对齐 rd_meeting）      │
│                                                                  │
│  [4/4] 主智能体委派子智能体开发                                   │
│        主控 system prompt 注入环境表 → 委派 Worker                │
│        Worker 读 SKILL → run_skill_script(cursor-operation.py)  │
│        → 改码 / diff / manifest（由技能工作流完成，非测试脚本直连）│
└──────────────────────────────────────────────────────────────────┘
```

## 智能体架构

| 角色 | Profile ID | 说明 |
|------|------------|------|
| 主控（小鲸） | `default` | `DEFAULT_HOST_PROFILE_ID`；具备 `delegate_to_agent` 等 Host 工具 |
| 子智能体 | `whalecloud-rd-expert` | 浩鲸产品研发专家；与会议室「协作智能体」为同一 Profile |

子智能体技能来自 Profile 的 `skills` 列表（`skills_mode=inclusive`）。测试启动时若缺少 `whalecloud-dev-tool-development` 会自动追加并保存到 ProfileStore。

典型挂载（含运行时自动依赖）示例：

- `whalecloud-dev-tool-development`（代码开发，需在智能体管理中绑定）
- `whalecloud-dev-tool-base-scripts`（`agent_runtime._ensure_whalecloud_base_scripts` 自动追加）
- 以及 Profile 中已有的 `whalecloud-dev-tool-c-code-access`、`whalecloud-dev-tool-module-function` 等

### 与研发会议室（`src/synapse/rd_meeting`）的对齐点

| 能力 | 代码位置 | 在 e2e 中的用途 |
|------|----------|----------------|
| 工具白名单 / 技能摘要 | `rd_meeting/agent_runtime.py` | Host/Worker `apply_meeting_agent_runtime` |
| 会话绑定 | `rd_meeting/agent_session.py` | `bind_meeting_agent_session` |
| 展示名 | `rd_meeting/participants.py` | `resolve_profile_display_name` |
| 委派 | `agents/orchestrator.py` | `orchestrator.delegate` 或 Host LLM 调工具 |

会话 ID 使用 `dev_flow_{TASK_ID}`（**非** `rd_meeting:*`），从而跳过会议室 `submit_meeting_work_plan` 门禁，仅复用运行时配置与委派机制。

### 第 4 步委派模式

| 模式 | 环境变量 | 行为 |
|------|----------|------|
| 默认 | （无） | `orchestrator.delegate` → 子智能体 LLM 按技能开发 |
| Host 自主委派 | `DEV_FLOW_LLM_HOST=1` | `orchestrator.handle_message`，由主智能体 LLM 调用 `delegate_to_agent` |
| 仅验证配置 | `DEV_FLOW_SKIP_LLM=1` | 执行 [1/4]–[3/4] 与主控 prompt 预览，不调用 LLM |

## 核心模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 端到端入口 | `test_dev/tests/test_e2e/test_full_flow.py` | 四步流程与 Agent 预热 |
| 开发技能 | `skills/whalecloud-dev-tool-development/SKILL.md` | 函数级方案 → Cursor 开发约定 |
| 技能脚本 | `skills/whalecloud-dev-tool-development/scripts/cursor-operation.py` | 子智能体经 `run_skill_script` 调用 |
| 会议室运行时 | `src/synapse/rd_meeting/agent_runtime.py` | 工具裁剪、技能 L1 摘要 |
| 多智能体编排 | `src/synapse/agents/orchestrator.py` | 委派与池化执行 |

## 函数级方案文档

路径：`{WORK_DIR}/archive/需求设计/func_solution/函数级方案.md`

Markdown 格式，供大模型阅读理解（不程序解析结构）。示例：

```markdown
# 函数级方案

## 模块：用户认证

### authenticate_user
说明：验证用户凭据，返回认证令牌
参数：
- username: str 用户名
- password: str 密码
返回值：str 认证令牌
```

## 产物清单结构

由 `whalecloud-dev-tool-development` 技能在开发完成后写入 `artifacts/manifest.json`，结构参考：

```json
{
  "task_id": "21881453",
  "created_at": "2026-01-01T12:00:00Z",
  "finished_at": null,
  "status": "in_progress",
  "worktree": "C:/Users/jetlin/.synapse/work/21881453/code/ZMDB/BackServiceCpp/src/cpp/Zmdb",
  "functions": [
    {
      "name": "函数级方案",
      "status": "completed",
      "patch_file": "diff/changes.patch"
    }
  ],
  "summary": {
    "total": 1,
    "completed": 1,
    "failed": 0,
    "pending": 0
  }
}
```

## 测试运行

需在仓库根目录、已安装 Synapse 依赖的 venv 中执行：

```powershell
cd d:\github\openakita
.\.venv\Scripts\python.exe test_dev\tests\test_e2e\test_full_flow.py
```

仅校验环境与 Agent 配置（不调 LLM）：

```powershell
$env:DEV_FLOW_SKIP_LLM = "1"
.\.venv\Scripts\python.exe test_dev\tests\test_e2e\test_full_flow.py
```

## 预期输出（`DEV_FLOW_SKIP_LLM=1`）

```
============================================================
研发代码开发 — 端到端流程验证
============================================================

[1/4] 检查目录...
  ✓ 工作目录: C:\Users\jetlin\.synapse\work\21881453
  ✓ 代码目录: C:\Users\jetlin\.synapse\work\21881453\code\ZMDB\BackServiceCpp\src\cpp\Zmdb
  ✓ 技能脚本: D:\github\openakita\skills\whalecloud-dev-tool-development\scripts\cursor-operation.py

[2/4] 检查函数级方案文档...
  ✓ 方案文档已加载 (18268 字符)

[3/4] 启动主智能体并分配子智能体...
  ✓ 主智能体: 小秋 (`default`)
  ✓ 子智能体: 浩鲸产品研发专家 (`whalecloud-rd-expert`)
  ✓ 子智能体技能: whalecloud-dev-tool-development
    技能列表: ['...', 'whalecloud-dev-tool-development', 'whalecloud-dev-tool-base-scripts', ...]

[4/4] 主智能体委派子智能体执行代码开发...
  · 编写主智能体提示词（含环境信息）...
  ...
  ⚠ 已跳过 LLM 执行（取消 DEV_FLOW_SKIP_LLM 或设为 0/false 以启用完整委派）

============================================================
✓ 环境与子智能体配置验证完成（未调用 LLM）
============================================================
```

完整委派成功后，第 4 步会打印子智能体返回摘要，并**校验交付物**（`artifacts/manifest.json` 或 `archive/需求研发/diff/*.patch`）；仅有文字回复视为失败。

## 已知问题与框架侧修复（2026-05）

| 问题 | 修复 |
|------|------|
| 子 Agent 首轮 `get_skill_info` 被 Todo 门禁挡住 | `agent.py` / `tool_executor.py`：`_is_sub_agent_call` 时跳过 `todo_required` |
| 连续 `run_shell` 后被迫收尾、未调 `run_skill_script` | `supervisor.py`：nudge 提示改用 `run_skill_script` |
| test_dev 下技能「注册表未找到」 | `test_full_flow` 启动时 `_bootstrap_synapse_paths()` 指向仓库根 |
| 委派成功但无 manifest | `test_full_flow` 增加 `_verify_delegation_deliverables()` |
