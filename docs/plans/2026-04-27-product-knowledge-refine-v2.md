# 产品知识文档 AI 编辑（Refine）改造方案 v2

**状态**：设计稿（待评审 / 排期实现）  
**日期**：2026-04-27  
**范围**：`apps/setup-center` 产品详情文档页 + Synapse `dev_iwhalecloud_knowledge` 的 `product_knowledge/refine` 及相关前端 API。

---

## 1. 背景与目标

当前实现中，前端将**整篇 Markdown** 通过 `POST /api/dev/iwhalecloud/product_knowledge/refine` 传给 Synapse，后端用**完整默认 Agent** 执行改写，成功后整段覆盖编辑器。存在：请求体过大、与「生成任务」执行策略不一致、无可视化 diff、与权威落盘路径关系不清晰等问题。

本方案按产品侧补充意见，将 refine 调整为：

- **不在请求中传递文档正文**（由后端从**本地知识文档根目录**按「产品 + 文档类型 + 稳定文件名」读取，与研发统一服务无关）。
- **后端执行策略与生成任务对齐**：锁 system、白名单工具、支持指定模型；预置 system 提示词可版本化、可审计。
- **非流式**：一次请求阻塞到任务完成；完成后产物落在会话临时目录，前端再拉取全文做 **inline diff** 对照检查。
- **围栏与解析**维持现有严格约定（仅 `` ```markdown ``），不扩展兼容分支。
- **用户消息结构**：服务端拼装「产品信息（自动）+ 用户要求」；请求体只携带标识与用户原始要求。
- **修改对象**可为 Markdown 文档或附属资源（如 `.excalidraw` 等），**稳定文件名不变**（见 §3.6）。
- **禁止直接覆盖权威源文件**：模型/工具只写**会话临时目录**下的副本；用户确认后再走现有提交写回流程。
- **异常处理与国际化**按工程惯例补齐。

---

## 2. 现状摘要（便于对照）

| 环节 | 现状 |
|------|------|
| 前端 | `ProductDocumentEditor` → `refineProductKnowledge(synapseApiBase, { content, prompt })` |
| 后端 | `product_knowledge_refine`：`body.content` + `body.prompt` 拼进 user 侧长 prompt；`execute_task_from_message`；**未**锁 system / **未**裁剪工具；**无** `preferred_endpoint` |
| 文档来源 | 编辑器内 `content` 来自 Tauri 下 `getProdDoc`（研发统一服务）；与 Synapse 请求体重复；**refine 改造后与统一服务解耦**，以 Synapse 本地 `tmp/docs` 为准 |

---

## 3. 需求要点（与方案映射）

### 3.1 不传递文档正文 + 文档加载路径（已定案）

**原则**：HTTP 请求只传**定位信息**与**用户意图**，正文由 Synapse 从**本地临时知识文档根目录**读取。

**与研发统一服务的关系**：refine 的读/写工作副本**不依赖**统一服务 `get_doc` 或网络拉取；权威内容与生成任务一致，落在 Synapse 本机的知识产出目录。实现上**直接改 `product_knowledge_refine` 及相关逻辑即可**，路径约定与生成任务共用同一套函数。

**知识文档根目录**（与生成任务 `_run_knowledge_generation_task` 中一致）：

```text
{knowledge_docs_root} = {synapse_home}/tmp/docs/{prod_name}/{doc_type}/
```

对应代码：`_knowledge_docs_root(doc_type, prod_name)`（`dev_iwhalecloud_knowledge.py` 内 `output_dir = _knowledge_docs_root(...); output_dir.mkdir(...)` 与生成任务相同语义）。

**读取规则**：对 `targets` 中每个稳定文件名，从 `{knowledge_docs_root}/<文件名>` 读取当前磁盘内容作为 refine 的「修改前」基准；若文件不存在则返回明确错误码（如 `target_not_found`），不从前端 `content` 兜底（避免双源）。

**请求体（建议字段，命名可在实现时 snake_case 与现有 API 风格对齐）**：

| 字段 | 说明 |
|------|------|
| `prod` / `prod_name` | 产品标识（与生成任务、目录名一致） |
| `doc_type` | 文档类型（与生成任务 wire 一致） |
| `targets` | 本次要改动的**稳定文件名**列表，至少一项；例如 `[ "FUNCTIONAL_ARCH.md" ]` 或 `[ "sys_arch.excalidraw" ]` |
| `user_prompt` | **仅用户手写要求**（不含产品信息块） |
| `preferred_endpoint` | 可选；与生成任务一致，映射到 `AgentProfile.preferred_endpoint` |
| 产品摘要字段 | 见 §3.5；用于注入 user 消息，**不**承载文档正文 |

**服务端拼装「完整用户消息」**（不放在请求体里由前端拼，避免篡改与重复）：

- 将 **产品信息** 自动注入到发给模型的 user 消息**上部**（字段与模板见 §3.5），与 `user_prompt` 明确分段。
- 固定模板示意：

```text
## 产品上下文（系统自动注入，请勿删除）
<产品描述、代码路径、主要功能等>

## 用户修改要求
<user_prompt 原文>

## 待修改文件（仅允许修改下列路径对应的临时工作副本）
- {session_root}/proposed/<稳定文件名> ...
```

（具体清单在实现时列出逻辑路径，工具 `write_file` 仅允许落在会话目录下，见 §4、§3.7。）

### 3.2 后端仍走 refine，但与生成任务对齐

**路由**：可保留 `POST .../product_knowledge/refine`（或新增 v2 后废弃旧路径；若 breaking 则版本化 `/refine/v2`）。

**与 `_run_knowledge_generation_task` 对齐的要点**：

1. **临时 Profile**：`ephemeral=True`，`preferred_endpoint` 来自请求。
2. **锁 system**：`agent._org_context = True`，`agent._context.system = <REFINE_MINIMAL_SYSTEM>`（常量或独立 `prompts/product_knowledge_refine_system.md` 便于评审与 diff）。
3. **工具白名单**：仅保留 refine 所需工具（见 §4）；**先**采用子集：`read_file`、`write_file`（若需列目录再开放 `list_directory`），**禁止** `run_shell` 除非单独评审开启。
4. **`execute_task_from_message`**：user 消息为 §3.1 / §3.5 拼装结果；**以文件落盘为准**：模型仅向会话目录下的 `proposed/` 写入完整文件；最终 HTTP 响应以 `session_id` + manifest（路径、校验和等）为主，assistant 文本中的 `` ```markdown `` 围栏仅作可选校验，不作为唯一真相源。

**预置 system 提示词（必须明确写出，实现时落文件）**应至少声明：

- 角色：产品知识文档编辑助手。
- 输入：产品上下文、用户要求、允许修改的文件清单（会话内逻辑路径）。
- 输出约束：对 Markdown 输出完整可替换正文；对 `.excalidraw` 输出合法 JSON；**推荐仅用工具写文件**，避免在 chat 中贴大段 JSON。
- 围栏：若自然语言回复中带文档片段，**必须**且仅能使用 `` ```markdown ... ``` `` 包裹（与现解析一致）。
- **禁止**：擅自**改名**（`targets` 中的文件名必须与磁盘一致）、删除未要求删除的章节、调用非白名单工具、**直接写入 `{knowledge_docs_root}` 根下除会话子目录外的路径**（权威源只读，见 §3.7）。

### 3.3 非流式：阻塞完成 → 临时落盘 → 前端 diff

**原则**：**不需要流式返回**。前端发起 refine 后**保持 loading/阻塞态**，直到后端一次执行结束；后端将「修改前快照」与「修改后提案」写入 §3.7 的会话临时目录后，返回 `session_id`（及 manifest）；前端再请求或携带路径**拉取两侧全文**，用 **inline diff**（及必要时 side-by-side）展示差异，用户检查后再接受/拒绝。

**API 形态**：

- 单一 **JSON** 响应（无 SSE）；字段包含：`session_id`、`targets`、`paths` 或 `GET .../refine/{session_id}/file?target=...` 的约定说明、错误时 `errorcode` + `message`。
- 超时与取消策略与现有 `execute_task_from_message` 超时配置对齐，并在文档中写明前端超时提示文案（i18n）。

### 3.4 围栏与解析

维持：**仅**识别 `` ```markdown\s*(.*?)\s*``` ``（`re.DOTALL`），不做 `` ```md `` 等扩展。文档规范在 system 中写死。非流式场景下，**优先以 `proposed/` 落盘文件为准**；围栏解析可作为二次校验或兼容旧模型习惯。

### 3.5 上下文元数据与用户提示词

- **请求体**：`user_prompt` = 用户要求（短句/列表均可）。
- **服务端**：将 **产品信息** 自动注入到发给模型的 user 消息**上部**，与 `user_prompt` 明确分段。

**产品信息（与生成任务 user 提示块对齐，最小集）**  

与 `_run_knowledge_generation_task` 中注入格式一致，refine 侧至少包含：

- **产品描述**：`product_desc`
- **代码路径**：`code_path`（若有）
- **主要功能**：`core_features`

示例（实现时可略作格式化，但语义一致）：

```text
产品描述：[{product_desc}]
代码路径：[{code_path}]
主要功能：[{core_features}]
```

另可附带：`prod_name`、`doc_type`、知识分类中文名（便于模型理解）。**禁止**把敏感 token 写入 prompt。若部分字段仅前端有：在 refine 请求体中增加**非敏感**摘要字段，后端原样注入——与「不传文档正文」不冲突。

### 3.6 文档与图片（资源）统一命名

- `targets` 中每一项为**稳定文件名**（与 `{knowledge_docs_root}` 下已有文件名、`![...](foo.excalidraw)` 引用名一致）。
- **文档命名不得变更**：会话内副本、工具写入、diff 展示均使用**同一稳定文件名**（仅目录层级不同：根目录权威只读 vs `refine_sessions/<session>/proposed/` 等）。
- 用户「接受变更」后，再由现有 **`docs_submit` / 统一服务提交**流程写回业务侧（本方案不重新定义提交契约）。

### 3.7 临时文件目录（会话子路径，在知识文档根下）

**禁止**在 refine 过程中直接覆盖 `{knowledge_docs_root}/<稳定文件名>`。所有模型产出与对比用副本放在**知识文档根目录下新建的会话子目录**中，例如：

```text
{knowledge_docs_root}/refine_sessions/{session_id}/
  original/   # 可选：发起 refine 时从根目录拷贝的快照，便于与磁盘漂移对齐
  proposed/   # 模型仅允许 write_file 到此目录下；文件名与 targets 一致
  manifest.json  # 可选：checksum、字节数、完成时间
```

- `session_id`：服务端生成（UUID），在 JSON 响应中返回。
- **工具路径校验**：`read_file` 可读 `{knowledge_docs_root}` 下权威文件（只读）及本会话目录；`write_file` **仅允许** `{knowledge_docs_root}/refine_sessions/{session_id}/proposed/` 前缀（及实现时明确列出的子路径）。
- **清理**：接受/拒绝/会话过期（如 24h）后删除 `refine_sessions/{session_id}`；可配合定时任务。

**前端**：

1. 发起 refine → 阻塞等待 → 拿到 `session_id` + `targets`。
2. 拉取 `original` 与 `proposed` 全文（或单接口返回两段 base64/UTF-8），使用 **inline diff** 为主（Monaco DiffEditor 或 `react-diff-view` 等，按现有依赖选型）；具体交互与样式在实现阶段微调。
3. **接受 / 拒绝**：
   - **拒绝**：丢弃会话，不调写回。
   - **接受**：将 `proposed` 内容写回当前编辑器状态 / `openDocs`，并可触发保存；**是否写回磁盘权威路径**与产品现有「保存/提交」流程对齐。
   - **类 Cursor 的部分接受**：目标体验为**仅应用选中 hunk 或选中范围**（而非只能「整文件接受」）。实现上可先落地「整文件接受/拒绝」，再迭代 **hunk 级或选区合并**（Monaco / diff 库能力需验证）；**具体效果以首版实现联调为准**，在 P1/P2 分阶段验收。

### 3.8 异常处理与国际化

**后端**：

- 统一 `errorcode` + `message`；细分：`target_not_found`、`read_authoritative_failed`、`agent_timeout`、`empty_proposed`、`parse_fence_failed`、`path_violation`（工具写出允许前缀外）等。
- 非流式：错误在唯一 JSON 响应中返回；HTTP 状态码与业务 `errorcode` 约定一致。

**前端**（`zh.json` / `en.json`）：

- 新增键：`workbench.products.detail.refine*` 下区分 loading、diff、accept、reject、partial_apply（若启用）、各类错误标题与简短说明。
- Toast 与 diff 面板内文案全部走 `t()`。

---

## 4. Refine 专用工具白名单（建议）

| 工具 | 用途 |
|------|------|
| `read_file` | 读取 `{knowledge_docs_root}/<稳定文件名>` 及本会话 `original/`、`proposed/`（路径前缀校验） |
| `write_file` | **仅**写入 `{knowledge_docs_root}/refine_sessions/{session_id}/proposed/` |
| `list_directory` | 可选；仅允许列出本会话目录或 `{knowledge_docs_root}` |

**明确禁止**（除非后续单独评审）：`run_shell`、网络类工具、任意删除生产路径、向 `refine_sessions/{session_id}/proposed/` 外写入与 targets 同名的「覆盖权威文件」行为。

---

## 5. 与生成任务的对照表

| 项 | 生成任务（现状） | Refine（目标） |
|----|------------------|----------------|
| Profile | ephemeral + preferred_endpoint + skills 白名单 | ephemeral + preferred_endpoint + **无技能或空技能** |
| System | 极简 + 技能注入 | **极简固定文案**（无技能或仅静态短说明） |
| Tools | 白名单 | **更小白名单**（读写 + 可选 list） |
| 文档根路径 | `_knowledge_docs_root` → `agent.default_cwd` | **读取**同一根目录；**写入**仅 `refine_sessions/<session>/proposed/` |
| 输入 | 大段任务描述 + 产品描述/代码路径/主要功能 | **同风格产品块** + `user_prompt` + 文件清单 |
| 输出 | 工具写 `{knowledge_docs_root}` 下交付物 | **只写 proposed 临时副本**；文件名与 targets 一致 |
| 流式 | 无（异步 task） | **无**；单次请求阻塞至完成 |
| 前端 | 轮询任务状态 | **阻塞 loading** → 拉取 diff → 接受/拒绝（及部分接受迭代） |

---

## 6. 实现阶段（建议排期）

| 阶段 | 内容 | 验收 |
|------|------|------|
| P0 | 新请求体；从 `_knowledge_docs_root` 读权威文件；锁 system + 工具 + `preferred_endpoint`；会话目录 `refine_sessions/{session_id}` 下 `original`/`proposed`；非流式 JSON 返回 `session_id` + manifest | 不传 `content` 仍可完成一次 refine；**不覆盖**根目录同名权威文件 |
| P1 | 前端阻塞请求 + inline diff + 整文件接受/拒绝 + 写回编辑器；i18n + 错误码 | 用户可视对比并整文件应用或放弃 |
| P2 | 类 Cursor **部分接受**（hunk/选区）；联调效果评估；会话清理与路径审计 | 可按块应用且不破坏稳定文件名 |
| P3 | 指标日志、权限复核 | 运维可接受 |

---

## 7. 开放问题（实现前需确认）

1. **`.excalidraw` 等大 JSON**：是否强制「仅工具写 `proposed/`、assistant 文本尽量短」以避免模型在 chat 中贴超长 JSON？
2. **多文件 `targets`**：一次 refine 默认「按文件分别接受」还是「manifest 级批量接受」？与部分接受组合时的交互优先级。
3. **编辑器与磁盘不一致**：若用户未保存本地编辑、磁盘已是旧内容，是否要在 refine 前强制提示「以磁盘为准」或增加可选 `content_hash` 校验（超出 v2 最小范围时可列为 P2）。

---

## 8. 涉及文件（实现时参考）

| 区域 | 路径 |
|------|------|
| 后端路由与任务 | `src/synapse/api/routes/dev_iwhalecloud_knowledge.py`（`_knowledge_docs_root`、`product_knowledge_refine`、生成任务 `_run_knowledge_generation_task`） |
| 前端 API | `apps/setup-center/src/api/rdUnifiedService.ts`（`refineProductKnowledge` 签名变更；**不**再传全文 `content`） |
| 编辑器与 UI | `apps/setup-center/src/components/product/ProductDocumentEditor.tsx`、`ProductDetail.tsx` |
| 文案 | `apps/setup-center/src/i18n/zh.json`、`en.json` |

---

## 9. 小结

本方案将 **refine** 从「前端传全文 + 全量 Agent」改为「**标识符驱动** + **与生成任务同一本地文档根 `_knowledge_docs_root`** + **会话子目录临时产物** + **非流式阻塞 + inline diff 门禁**」；**与研发统一服务解耦**；**产品信息**以生成任务同款「产品描述 / 代码路径 / 主要功能」为主注入 user 消息；**稳定文件名不变**；接受/拒绝以整文件为 P1，**部分接受**对标 Cursor 在 P2 用实现效果验证。

评审通过后，可按 §6 分阶段提交 PR，并在 `apps/setup-center/DIFF.md`（若触及该包）补充变更摘要。
