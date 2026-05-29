---
name: whalecloud-dev-tool-development
description: "代码开发技能 - 根据函数级方案文档，通过 Cursor CLI 实现代码开发。智能体通过调用 cursor-operation.py 脚本执行开发任务，产出代码和 Patch 文件。"
label: 代码开发技能
---

# 代码开发技能

根据函数级方案文档，通过 Cursor CLI 实现代码开发。智能体通过调用 `scripts/cursor-operation.py` 脚本执行开发任务，产出代码文件和 Patch 产物。

---

## Parameters

| Parameter | 必填 | 说明 / 示例 |
|-----------|------|----------------|
| `WORK_DIR` | 是 | 研发会议室工作目录，如 `C:/Users/jetlin/.synapse/work/21881453`。所有路径由此推导 |
| `FUNC_SOLUTION_DOC` | 是 | 函数级方案文档路径。推导路径：`{WORK_DIR}/archive/需求设计/func_solution/函数级方案.md` |
| `CODE_PATH` | 是 | 代码工作目录。推导路径：`{WORK_DIR}/code/ZMDB/BackServiceCpp/src/cpp/Zmdb` |
| `OUTPUT_DIR` | 是 | 产物输出目录。推导路径：`{WORK_DIR}/archive/需求研发/` |
| `AUTO_CONFIRM` | 否 | 是否自动确认 Cursor 的危险操作提示，默认 `false`（默认拒绝） |
| `TIMEOUT` | 否 | 单次 Cursor 调用超时时间（秒），默认 `300` |

---

## 核心约束

### A. 调用方式

智能体不直接调用 Cursor CLI，而是通过执行 `scripts/cursor-operation.py` 脚本间接调用。

详细使用说明见 `references/cursor-operation-usage.md`

### B. 输入要求

1. **函数级方案文档**（Markdown 格式）：
   - 由上游 `whalecloud-dev-tool-function-solution` 技能生成
   - 供大模型阅读理解，不程序解析
   - 文档中包含函数说明、参数、返回值、伪代码等

2. **代码目录**：
   - 已克隆到本地的源代码
   - Cursor 直接在此目录修改代码

### C. 输出产物

1. **代码文件**：
   - Cursor 修改后的源代码文件
   - 保存在 `CODE_PATH` 目录

2. **Patch 文件**：
   - 通过 `git diff` 生成
   - 输出到 `{OUTPUT_DIR}/diff/` 目录
   - 文件命名：`{函数名}.patch`

3. **产物清单**（`artifacts/manifest.json`）：
   - 任务状态
   - 函数列表及状态
   - Patch 文件路径

### D. 禁止事项

- Cursor 修改代码后**不要提交**
- 代码修改由后续环节使用 Patch 提交

---

## 工作流程

```
Step 1 — 准备环境
  1a. 验证函数级方案文档存在
  1b. 验证代码目录存在
  1c. 创建产物输出目录（artifacts/, diff/）

Step 2 — 执行代码开发
  2a. 智能体读取函数级方案文档
  2b. 调用 scripts/cursor-operation.py 执行
  2c. 实时跟踪进度（tool_call 事件）

Step 3 — 生成产物
  3a. 执行 git diff 生成 Patch 文件
  3b. 更新 manifest.json
  3c. 记录完成状态
```

---

## 技能文件结构

```
whalecloud-dev-tool-development/
├── SKILL.md                           # 技能定义
├── scripts/
│   └── cursor-operation.py            # Cursor CLI 调用脚本
└── references/
    └── cursor-operation-usage.md      # 脚本使用说明书
```

---

## 目录结构

```
C:\Users\jetlin\.synapse\work\21881453\
├── archive/
│   ├── 需求设计/func_solution/
│   │   └── 函数级方案.md          # 输入：函数级方案文档
│   └── 需求研发/                   # 输出：产物目录
│       ├── artifacts/
│       │   └── manifest.json      # 产物清单
│       └── diff/
│           └── *.patch            # Patch 文件
└── code/ZMDB/BackServiceCpp/src/cpp/Zmdb/  # 代码目录
```

---

## 产物清单结构

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

---

## 与上游技能衔接

| 上游技能 | 输出物 | 本技能用途 |
|----------|--------|------------|
| `whalecloud-dev-tool-function-solution` | 函数级方案.md | 作为输入，供大模型阅读理解 |

本技能**不解析**函数级方案文档内容，而是让 Cursor 大模型阅读理解后实现代码。
