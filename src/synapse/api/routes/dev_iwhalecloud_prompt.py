"""iWhaleCloud / 产品知识：与大模型交互的提示词与拼装函数（供 dev_iwhalecloud_knowledge 使用）。"""

from __future__ import annotations

from pathlib import Path

# 系统提示词：产品知识文档 AI 编辑（refine 专用）
REFINE_SYSTEM_PROMPT_BASE = """\
你是一个产品知识文档编辑助手。你的任务是根据用户要求，精准修改指定的产品知识文档。

## 核心原则（不得违反）
1. **以实际代码为基础不臆断**：所有新增/修改内容必须有源码依据；若源码缓存存在则优先读取，找不到依据时须标注「[待源码确认]」，不得凭空描述。
2. **以历史文档为参考不造谣**：必须先完整读取待修改文件，保留用户未要求修改的所有章节与措辞；不得凭印象替换已有准确描述。
3. **以用户需求为根本不发散**：修改范围严格限定在用户指定内容，不主动扩展修改其他章节。

## 工作流程
请严格按照以下步骤执行（已注入的技能 whalecloud-dev-tool-arch-modify 中有完整的分阶段指引，请遵照执行）：

1. **解析修改意图**：读取 user 消息中的产品上下文与用户修改要求，拆解修改点列表。
2. **读取历史文档**：使用 read_file 工具读取待修改文件（会话 proposed/ 目录下的工作副本），记录不应被修改的章节。
3. **查阅源码**（若修改涉及功能描述/架构关系）：
   - 先检查源码本地缓存路径（`synapse_home/tmp/gitnexus/<repo_name>/files/`）是否存在；
   - 缓存存在则直接用 read_file / list_directory 读取，**不需要重新拉取**；
   - 缓存不存在则从 CODE_PATH 指定路径直接读取源文件；
   - 每个修改点记录「源码依据：<文件路径> → <具体证据>」。
4. **修改文档**：按修改点逐一修改，不扩散到其他章节，新增内容附源码路径作为论据。
5. **完整性校验**：确认未被要求修改的章节均已保留，修改点均有源码依据或标注「[待源码确认]」。
6. **写回文件**：使用 write_file 将完整修改后的文档写回 proposed/ 目录（同一文件名）。

## 输出约束
- Markdown 文档：输出完整可替换的正文；若在回复文字中附带文档片段，**必须**且仅能用 ```markdown ... ``` 包裹。
- `.excalidraw` 文件：输出合法 JSON；优先使用工具写文件，避免在聊天中贴大段 JSON；节点名称必须来自真实源码符号。
- **禁止**改变文件名（必须与 targets[0] 一致）。
- **禁止**删除用户未要求删除的章节。
- **禁止**直接写入知识文档根目录下的权威源文件（只允许写 proposed/ 子目录）。
- **禁止**调用不在白名单中的工具（如 run_shell）。
- **禁止**臆断产品功能和代码实现；未找到源码证据的描述必须标注「[待源码确认]」。
"""

# 架构文档生成：极简 system 提示前缀（技能指引由 format_rd_skill_guidance_section 拼接）
KNOWLEDGE_GEN_SYSTEM_INTRO = "你是一个研发工具助手，请按照用户的要求生成系统架构文档。"


def format_rd_skill_guidance_section(skill_bodies: list[str]) -> str:
    """将各技能正文块拼成注入 system prompt 的「研发工具技能指引」段；无技能时返回空串。"""
    if not skill_bodies:
        return ""
    return "\n\n---\n## 研发工具技能指引（请严格遵照以下指引执行任务）\n\n" + "\n\n---\n\n".join(
        skill_bodies
    )


def build_knowledge_gen_system_prompt(skill_bodies: list[str]) -> str:
    """生成任务使用的极简 system prompt（ intro + 技能指引）。"""
    return KNOWLEDGE_GEN_SYSTEM_INTRO + format_rd_skill_guidance_section(skill_bodies)


def build_knowledge_generation_user_prompt(
    *,
    gitnexus_url: str,
    repo_name: str,
    local_data_path: Path | str,
    output_dir: Path | str,
    prod_name: str,
    doc_type: str,
    request_repo_name: str,
    product_desc: str,
    code_path: str,
    core_features: str,
) -> str:
    """产品知识架构生成：发给 LLM 的 user 消息正文。"""
    return f"""gitnexus服务部署在[{gitnexus_url}]上，请使用产品架构文档生成工具生成产品的系统架构和功能架构文档。

## 路径与参数约定（GitNexus / Synapse 脚本见技能 whalecloud-dev-tool-base-scripts；工作流与模板见 whalecloud-dev-tool-arch-create，勿改写目录语义）
- **SYNAPSE_URL**：SynapseService 地址（`IP:PORT`）。若需按产品名调用 `scripts/get_repo_info.py` 拉取**全部**关联仓库列表，由对话或运维提供；本 HTTP 任务未单独传该字段时可为空（此时以下方已解析的 **REPO_NAME** 为准）。
- **GITNEXUS_URL**：`{gitnexus_url}`（`gnx-tools.js` / `fetch-arch-data.js` 的 `--url`）。
- **REPO_NAME**（本任务已解析，须与 GitNexus 图谱一致）：`{repo_name}`（来自 `repo_url` 解析或请求体 `repo_name` 兜底，**禁止**臆造其它仓库名）。
- **GNX_CACHE_DIR**（当前 **REPO_NAME** 的 materialize/read/grep 缓存根，等同 `_gitnexus_local_data_path`）：`{local_data_path}`
- **OUTPUT_DIR**（架构交付物唯一落盘目录，与 Agent `default_cwd` 一致，等同 `_knowledge_docs_root`）：`{output_dir}`
- **OUTPUT**（须全部写入 **OUTPUT_DIR**）：`FUNCTIONAL_ARCH.md`、`TECH_ARCH.md` 为必选。另：**仅当**本任务已挂载技能 `whalecloud-dev-tool-excalidraw`（system 提示「研发工具技能指引」中含该技能块）时，还须写入 `sys-arch-layers.excalidraw`、`tech-stack.excalidraw`；**未挂载**时**不要**创建上述 `.excalidraw` 文件，技术栈与分层示意须在 `TECH_ARCH.md` 内用 **Mermaid** 代码块（见 `whalecloud-dev-tool-arch-create` Phase 3）

## 任务上下文
产品标识（prod_name）：[{prod_name}]
文档类型（doc_type）：[{doc_type}]
请求体仓库名字段（可能与 REPO_NAME 不同，以已解析 REPO_NAME 为准）：[{request_repo_name}]
产品描述：[{product_desc}]
代码路径：[{code_path}]
主要功能：[{core_features}]"""


def build_refine_product_context(
    *,
    product_desc: str,
    code_path: str,
    core_features: str,
    prod_name: str,
    doc_type: str,
    gitnexus_url: str,
    gnx_cache_dir: str,
    gnx_tools_script: str,
) -> str:
    """refine：注入 user 消息中的产品上下文块。"""
    return f"""\
产品描述：[{product_desc}]
代码路径：[{code_path}]
主要功能：[{core_features}]
产品标识：[{prod_name}]
文档类型：[{doc_type}]
GitNexus 服务地址(GITNEXUS_URL)：[{gitnexus_url}]
GitNexus 本地数据根目录(GNX_CACHE_DIR)：[{gnx_cache_dir}]
gnx-tools.js 脚本路径：[{gnx_tools_script}]"""


def build_refine_user_message(
    *,
    product_ctx: str,
    gnx_tools_script: str,
    gitnexus_url: str,
    repo_name_hint: str,
    gnx_cache_dir: str,
    user_prompt: str,
    proposed_copy: Path | str,
) -> str:
    """refine：完整 user 消息（含源码说明、修改要求、工作副本路径）。"""
    return f"""\
## 产品上下文（系统自动注入，请勿删除）
{product_ctx}

## 关于源码读取的说明
1. 优先检查「源码缓存根目录」下的 files/ 子目录是否存在且有内容（用 list_directory 检查）。
2. 若缓存存在，直接用 read_file / list_directory 读取，**无需拉取**。
3. 若缓存不存在或为空，使用 run_shell 执行以下命令拉取：
   node "{gnx_tools_script}" materialize --url {gitnexus_url} --repo {repo_name_hint} --cache {gnx_cache_dir} --concurrency 8
4. 拉取完成后，源码位于「源码缓存根目录/files/」下，再用 read_file / list_directory 读取。

## 用户修改要求
{user_prompt}

## 待修改文件（仅允许修改下列路径对应的临时工作副本）
- {proposed_copy}

请按照技能 whalecloud-dev-tool-arch-modify 的工作流程执行：先读历史文档，再查阅或拉取源码，最后将修改后的完整文档写回上述路径。"""
