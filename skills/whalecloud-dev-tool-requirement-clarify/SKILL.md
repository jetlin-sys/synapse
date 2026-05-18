---
name: whalecloud-dev-tool-requirement-clarify
description: "需求澄清技能 - 分析原始需求，结合 GitNexus 源码检索，生成需要澄清的问题列表，逐轮向用户确认直到需求清晰。"
label:需求澄清技能
---

# 需求澄清技能

通过分析原始需求信息，结合 GitNexus 源码检索能力，逐轮向用户确认关键点，确保需求清晰可理解。

## 共享系统脚本（BASE_SCRIPTS_DIR）

与 SynapseService / GitNexus 交互的脚本位于技能 **`whalecloud-dev-tool-base-scripts`**（`skills/whalecloud-dev-tool-base-scripts/`）。**BASE_SCRIPTS_DIR** 为其根目录（系统提示中「研发技能：whalecloud-dev-tool-base-scripts」的 `**技能路径**:`）。`get_repo_info.py`、`get_doc.py`、`gnx-tools.js` 等须用 `<BASE_SCRIPTS_DIR>/scripts/...` 调用。

**例外**：`question-transform.py` 仍在本技能（`whalecloud-dev-tool-requirement-clarify`）目录的 `scripts/` 下，用于生成前端可渲染问题 JSON。

---

## Parameters

| Parameter | 必填 | 说明 / 示例 |
|-----------|------|----------------|
| `DEMAND_DESC` | 是 | 原始的需求描述内容 |
| `DEMAND_IMPACT` | 是 | 原始的需求影响内容 |
| `PROD_FEATURE` | 是 | 产品包含的功能模块列表信息 |
| `PROD` | 是 | 产品名称 |
| `SYNAPSE_URL` | 是 | SynapseService 服务地址，如 `192.168.1.100:8080` |
| `GITNEXUS_URL` | 是 | GitNexus 服务地址，如 `http://127.0.0.1:11011` |
| `GNX_REPO` | 否 | GitNexus 仓库名称，如 `MyProj@@branch`。若不传入，则自动通过 `<BASE_SCRIPTS_DIR>/scripts/get_repo_info.py` 获取产品关联的全部仓库 |
| `OUTPUT_DIR` | 否 | 输出目录，默认 `./requirements/` |
| `TMP_DIR` | 否 | 临时文件目录，默认 `{OUTPUT_DIR}/.tmp/`，其下存储 `docs/`（架构文档）和 `.gnx-cache/`（源码缓存，按仓库分目录） |
| `OUTPUT` | 否 | 输出文件名，默认 `01-需求澄清.md` |
| `USER_ANSWER` | 否 | 用户回复的内容（首次提问时为空） |

> **仓库名称**：无需手动传递。技能启动时自动通过 `<BASE_SCRIPTS_DIR>/scripts/get_repo_info.py` 从 SynapseService 获取该产品关联的**所有代码仓库**列表。一个产品通常由多个仓库组合而成（如 `仓库A` + `仓库B`），最终需求澄清结果整合所有仓库的源码分析结果。

---

## 核心约束（违反本技能视为未完成）

### A. 技能执行输出限制（强制约束）

**整个技能执行过程中，大模型只能输出以下内容：**

1. **提问阶段**：通过 `scripts/question-transform.py` 脚本生成并输出 JSON 格式的问题（可直接被前端渲染）
2. **生成文档阶段**：读取模板 `templates/01-需求澄清.md`，填充变量后输出 Markdown 格式的文档

**禁止输出任何其他内容**：
- 不得输出任何解释、说明、上下文等信息
- 不得输出 "正在分析"、"请稍等"、"以下是问题" 等提示
- 不得输出代码块标记（```json、```markdown 等），直接输出原始内容
- 不得输出任何调试信息、日志信息

**违反此约束视为技能未完成。**

### B. 多仓库源码核验（强制约束）

- 产品可能由**多个仓库**组成，每个仓库独立缓存至 `{TMP_DIR}/.gnx-cache/{REPO_NAME}/` 目录。
- 需求分析中凡涉及**模块路径、接口、依赖关系、关键符号**等结论，须在对应仓库缓存上通过 **`gnx-tools.js search`、`cypher`、`read` 或 `grep`** 至少提供一条可核对证据。
- **跨仓库结论必须分别核验**：对每个仓库独立执行检索操作，并在分析中标注信息来源于哪个仓库。
- 无法通过源码验证的条目必须标注 **`[待代码确认]`**，不得虚构。
- 若某仓库未获取成功，涉及该仓库的分析标注 `[待补充-{REPO_NAME}仓库未获取]`。

### C. 问题生成（必须使用脚本）

**必须使用 `scripts/question-transform.py` 脚本生成问题**，不得自行构造 JSON 输出。

生成问题的命令格式：

```bash
# 单选题
py question-transform.py --output_dir {TMP_DIR} --type=single --title="问题标题" --context="问题描述" --option1="选项A" --option2="选项B"

# 多选题
py question-transform.py --output_dir {TMP_DIR} --type=multiple --title="问题标题" --context="问题描述" --option1="选项A" --option2="选项B"

# 判断题
py question-transform.py --output_dir {TMP_DIR} --type=boolean --title="问题标题" --context="问题描述"
```

脚本会自动生成符合前端渲染要求的 JSON 格式，并保存到记录文件中。

**输出限制**：
- 不得输出任何解释、说明、上下文等信息
- 只能输出脚本生成的 JSON 内容

---

## 工作流程

```
技能调用流程：

当 USER_ANSWER 为空时（首次提问）：
  Step 0 — 参数校验与环境准备
    0a. 校验必填参数：对照 Parameters 章节，校验所有标记为"是"的参数均已提供
    0b. Python 命令适配：优先使用 `python3`，若不可用则尝试 `py`（Windows），均不可用则尝试 `python`。以下用 `{PYTHON}` 指代实际可用的 Python 命令。
    0c. 自动获取产品关联的所有仓库：
          → {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_repo_info.py --server-url={SYNAPSE_URL} --prod={PROD}
        解析输出 "产品：XXX 一共有N个仓库：REPO1,REPO2"，提取所有仓库名列表，记为 GNX_REPO_LIST。
        若用户传入了 GNX_REPO（单仓库兼容模式），则 GNX_REPO_LIST = [GNX_REPO]，跳过此步骤。
        若输出包含 "未找到仓库信息" 则**中止**并提示：该产品未关联代码仓库，请检查 PROD 参数。
    0d. 创建输出目录和临时目录（若不存在）：
          → mkdir -p {OUTPUT_DIR} {TMP_DIR} {TMP_DIR}/docs
          → 为每个仓库创建独立缓存目录：mkdir -p {TMP_DIR}/.gnx-cache/{REPO_NAME}
    0e. 执行 question-transform.py --reset --output_dir {TMP_DIR} 清理之前的问题列表
  
  Step 1 — 获取项目资料
    1a. 使用 get_doc.py 获取产品架构文档，保存到 {TMP_DIR}/docs/
          {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_doc.py --doc_type=产品架构 --server_url {SYNAPSE_URL} --prod {PROD} --doc_name=TECH_ARCH.md --output {TMP_DIR}/docs
          {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_doc.py --doc_type=产品架构 --server_url {SYNAPSE_URL} --prod {PROD} --doc_name=FUNCTIONAL_ARCH.md --output {TMP_DIR}/docs
    1b. 使用 gnx-tools.js materialize 下载源码到本地缓存（遍历 GNX_REPO_LIST）：
        对每个仓库依次执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js materialize --url {GITNEXUS_URL} --repo {REPO_NAME} --cache {TMP_DIR}/.gnx-cache/{REPO_NAME}
        任一仓库 materialize 失败：记录该仓库为「未能获取」，继续处理其余仓库。
        **仅当所有仓库均 materialize 失败时才中止。**
    1c. 使用 gnx-tools.js overview 获取项目概览（遍历 GNX_REPO_LIST）：
        对每个仓库依次执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js overview --url {GITNEXUS_URL} --repo {REPO_NAME} --out {TMP_DIR}/.gnx-cache/{REPO_NAME}/overview.json

  Step 2 — 初步分析与范围圈定
    2a. 分析 DEMAND_DESC 原始需求描述，了解需求背景
    2b. 分析 DEMAND_IMPACT 需求影响范围
    2c. 分析 PROD_FEATURE 功能模块列表
    2d. 结合架构文档和**所有仓库**的项目概览（各 overview.json），提取与需求相关的模块和入口信息
    2e. 生成范围圈定问题，帮助用户缩小分析范围（选择题）：
        - 涉及哪些功能模块？（参考 PROD_FEATURE 和架构文档列出，标注所属仓库）
        - 涉及哪些代码仓库？（从 GNX_REPO_LIST 列出，帮助用户确认是否排除部分仓库）
        - 核心应用入口或触发场景是什么？
        - 是否需要排除某些模块或场景？

  Step 3 — 输出范围圈定问题
    3a. 对每个范围圈定问题执行 question-transform.py --output_dir {TMP_DIR} 添加问题
    3b. 执行 question-transform.py --read --output_dir {TMP_DIR} 获取所有未回答的问题
    3c. 输出 JSON 格式的问题（等待用户回复范围信息）

当 USER_ANSWER 不为空时（非首次提问）：
  Step 0 — 参数校验与环境准备
    0a. 校验必填参数：对照 Parameters 章节，校验所有标记为"是"的参数均已提供
    0b. Python 命令适配（如尚未适配）：优先使用 `python3`，若不可用则尝试 `py`（Windows），均不可用则尝试 `python`。以下用 `{PYTHON}` 指代实际可用的 Python 命令。
    0c. 自动获取产品关联的所有仓库（如尚未获取）：
          → {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_repo_info.py --server-url={SYNAPSE_URL} --prod={PROD}
        解析输出提取仓库名列表 GNX_REPO_LIST。
        若用户传入了 GNX_REPO（单仓库兼容模式），则 GNX_REPO_LIST = [GNX_REPO]。
        若首次调用时已获取，则复用已有的 GNX_REPO_LIST。
    0d. 创建输出目录（若不存在）

  Step 1 — 更新答案
    1a. 解析 USER_ANSWER 中的问题和答案
    1b. 使用 question-transform.py --update --output_dir {TMP_DIR} 更新记录文件中的答案
    1c. 标记问题为已解决

  Step 2 — 深度需求分析
    2a. 结合用户回复的范围圈定信息，聚焦分析原始需求
    2b. 根据用户圈定的模块范围和入口场景，自行推导出关键搜索线索和关键词
    2c. 如果已有澄清问题记录，则结合之前的问答继续深入分析
    2d. 识别需要澄清的核心点，生成澄清问题列表（选择题/判断题）

  Step 3 — 获取架构文档（如尚未获取）
    3a. 使用 get_doc.py 获取产品架构文档，指定文件名过滤并保存到 docs/ 目录
        {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_doc.py --doc_type=产品架构 --server_url {SYNAPSE_URL} --prod {PROD} --doc_name=TECH_ARCH.md --output {TMP_DIR}/docs
        {PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_doc.py --doc_type=产品架构 --server_url {SYNAPSE_URL} --prod {PROD} --doc_name=FUNCTIONAL_ARCH.md --output {TMP_DIR}/docs
    3b. 分析架构文档内容，结合用户圈定的模块范围，提取相关模块说明

  Step 4 — GitNexus 检索（按仓库遍历）
    4a. 执行 gnx-tools.js materialize 下载源码到本地缓存（如尚未下载，遍历 GNX_REPO_LIST）：
        对每个仓库分别执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js materialize --url {GITNEXUS_URL} --repo {REPO_NAME} --cache {TMP_DIR}/.gnx-cache/{REPO_NAME}
        任一仓库失败则记录并跳过，继续处理其余仓库。
    4b. 使用 gnx-tools.js overview 获取项目概览（如尚未获取，遍历 GNX_REPO_LIST）：
        对每个仓库分别执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js overview --url {GITNEXUS_URL} --repo {REPO_NAME} --out {TMP_DIR}/.gnx-cache/{REPO_NAME}/overview.json
    4c. 使用 gnx-tools.js search 检索相关源码（遍历 GNX_REPO_LIST，基于 Step 2b 推导的关键词）：
        对每个仓库分别执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js search --url {GITNEXUS_URL} --repo {REPO_NAME} --query "关键词"
        汇总所有仓库的检索结果，标注每条结果所属仓库。
    4d. 使用 gnx-tools.js cypher 查询模块依赖关系（遍历 GNX_REPO_LIST）：
        对每个仓库分别执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js cypher --url {GITNEXUS_URL} --repo {REPO_NAME} --cypher "MATCH (c:Community) RETURN c LIMIT 10"
    4e. 使用 gnx-tools.js grep 本地搜索关键代码（遍历 GNX_REPO_LIST，每个仓库独立缓存）：
        对每个仓库分别执行：
          node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js grep --cache {TMP_DIR}/.gnx-cache/{REPO_NAME} --pattern "关键词"
    4f. 结合架构文档和**所有仓库**的源码检索结果，分析问题答案
    4g. 如果某问题可以通过文档/源码检索获得答案，将问题降级为判断题

  Step 5 — 生成澄清问题并输出
    5a. 对每个澄清问题执行 question-transform.py --output_dir {TMP_DIR} 添加问题
    5b. 执行 question-transform.py --read --output_dir {TMP_DIR} 获取所有未回答的问题
    5c. 输出 JSON 格式的问题

  Step 6 — 检查完成条件
    6a. 如果没有新的待确认点，执行 question-transform.py --readall --output_dir {TMP_DIR} 获取所有已回答的问题
    6b. 读取模板 `templates/01-需求澄清.md`，填充变量生成需求澄清文档
    6c. 写入输出文件 {OUTPUT_DIR}/{OUTPUT}
    6d. 清理中间产物：删除 {TMP_DIR}/.gnx-cache/ 目录（含各仓库子目录）和 {TMP_DIR}/.questions.json 文件
```

---

## 使用脚本说明

### get_doc.py

脚本路径：`<BASE_SCRIPTS_DIR>/scripts/get_doc.py`（见技能 `whalecloud-dev-tool-base-scripts`）

用于从 SynapseService 获取产品架构文档：

| 命令 | 说明 |
|------|------|
| `--doc_type=产品架构` | 获取产品架构文档 |
| `--doc_type=产品需求` | 获取产品需求文档 |
| `--doc_type=产品方案` | 获取产品方案文档 |
| `--server_url XXX` | SynapseService 服务地址 |
| `--prod XXX` | 产品名称 |
| `--doc_name XXX` | 可选，指定文件名进行过滤（支持模糊匹配） |
| `--output XXX` | 可选，指定输出目录，文档将保存到此目录 |

示例：
```bash
{PYTHON} <BASE_SCRIPTS_DIR>/scripts/get_doc.py --doc_type=产品架构 --server_url {SYNAPSE_URL} --prod {PROD} --doc_name=TECH_ARCH --output {TMP_DIR}/docs
```

### question-transform.py

脚本路径：`scripts/question-transform.py`

| 命令 | 说明 |
|------|------|
| `--reset` | 清空记录文件 |
| `--read` | 读取未回答的问题（JSON格式） |
| `--readall` | 读取所有问题（格式化输出） |
| `--update --title=xxx --answer=yyy` | 更新问题答案并标记为已解决 |
| `--type=single --title=xxx --option1=A --option2=B` | 添加新问题 |
| `--output_dir XXX` | 可选，指定记录文件输出目录 |

### gnx-tools.js

脚本路径：`<BASE_SCRIPTS_DIR>/scripts/gnx-tools.js`

用于与 GitNexus 交互，检索源码获取答案：

| 命令 | 说明 |
|------|------|
| `materialize --url XXX --repo YYY --cache ZZZ` | 下载源码到本地缓存（`--cache {TMP_DIR}/.gnx-cache`） |
| `overview --url XXX --repo YYY --out ZZZ` | 获取项目概览，了解整体架构 |
| `search --url XXX --repo YYY --query ZZZ` | 混合检索 |
| `cypher --url XXX --repo YYY --cypher "..."` | 图查询 |
| `explore --url XXX --repo YYY --target ZZZ` | 探索特定模块的依赖关系 |
| `read --cache XXX --path YYY` | 读取缓存文件（`--cache {TMP_DIR}/.gnx-cache`） |
| `grep --cache XXX --pattern ZZZ` | 本地正则搜索（`--cache {TMP_DIR}/.gnx-cache`） |

示例：
```bash
node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js materialize --url {GITNEXUS_URL} --repo {REPO_NAME} --cache {TMP_DIR}/.gnx-cache/{REPO_NAME}
node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js overview --url {GITNEXUS_URL} --repo {REPO_NAME} --out {TMP_DIR}/.gnx-cache/{REPO_NAME}/overview.json
node <BASE_SCRIPTS_DIR>/scripts/gnx-tools.js search --url {GITNEXUS_URL} --repo {REPO_NAME} --query "关键词"
```

### get_repo_info.py

脚本路径：`<BASE_SCRIPTS_DIR>/scripts/get_repo_info.py`

用于从 SynapseService 获取产品关联的代码仓库列表：

| 参数 | 说明 | 必填 |
|------|------|------|
| `--server-url` | 服务地址 | 是 |
| `--prod` | 产品名称 | 是 |

详细文档见 [../whalecloud-dev-tool-base-scripts/references/get_repo_info_readme.md](../whalecloud-dev-tool-base-scripts/references/get_repo_info_readme.md)。

---

## Error Handling

| 情况 | 处理 |
|------|------|
| 缺少必填参数（DEMAND_DESC/DEMAND_IMPACT/PROD_FEATURE/PROD/SYNAPSE_URL/GITNEXUS_URL） | **中止**，列出缺失参数 |
| get_repo_info.py 返回 "未找到仓库信息" | **中止**，提示该产品未关联代码仓库 |
| SYNAPSE_URL 不可达或 get_doc.py 下载失败 | 若架构文档缺失则**中止** |
| GITNEXUS_URL 不可达或**所有仓库** materialize 均失败 | **中止**，不得输出无源码核验的澄清结果 |
| 部分仓库 materialize 失败 | 记录失败仓库名，后续检索跳过该仓库，涉及该仓库的分析标注 `[待补充-{REPO_NAME}仓库未获取]`，继续处理其他仓库 |
| 某仓库 search/cypher/grep 无结果 | 记录该仓库无匹配结果，继续分析其他仓库 |
| 缓存中无某文件路径 | 标 `[待代码确认]`，不得虚构内容 |
| OUTPUT_DIR 不可写 | 中止并说明 |

---

## 输出文件

- 需求澄清文档：`{OUTPUT_DIR}/{OUTPUT}`，格式参考 `templates/01-需求澄清.md`
- 记录文件：`.questions.json`（脚本同目录下）

---

## 完整示例

### 首次调用（USER_ANSWER为空）
DEMAND_DESC: 系统需要支持索引优先级在线变更,
DEMAND_IMPACT: 影响集群管理模块,
PROD_FEATURE: 索引管理,集群管理,数据同步,
PROD: 分布式数据库,
OUTPUT_DIR: ./docs,
OUTPUT: 01-需求澄清.md


### 第二次调用（USER_ANSWER不为空）
DEMAND_DESC: 系统需要支持索引优先级在线变更,
DEMAND_IMPACT: 影响集群管理模块,
PROD_FEATURE: 索引管理,集群管理,数据同步,
PROD: 分布式数据库,
OUTPUT_DIR: ./docs,
OUTPUT: 01-需求澄清.md
USER_ANSWER: 问题1：索引优先级的类型 内容：请选择索引优先级类型 状态：已解决 用户回复：B+Tree索引

