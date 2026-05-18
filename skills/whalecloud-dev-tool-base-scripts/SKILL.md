---
name: whalecloud-dev-tool-base-scripts
description: "研发工具共享脚本包：SynapseService / GitNexus / 图谱工单检索等系统交互的可执行脚本与说明，供 whalecloud-dev-tool-* 业务技能引用。Examples: gnx-tools materialize、get_repo_info、get_doc、历史工单 hybrid/relation/cypher 查询。"
label: 研发工具共享脚本
---

> **系统约束**：本技能由 Synapse / Setup Center **强制启用**（不可从 `data/skills.json` 的 `external_allowlist` 中移除），且**不可卸载**；与具体 `SKILL.md` 是否声明 `system: true` 无关。

# whalecloud-dev-tool-base-scripts（共享脚本）

本技能**仅提供**与外部系统交互的脚本与参考说明，**不包含**具体业务流程（架构生成、需求澄清、手册撰写等由其它 `whalecloud-dev-tool-*` 技能定义）。

## 路径约定

- **BASE_SCRIPTS_DIR**：本技能根目录（系统注入的研发任务提示中，本技能块内 `**技能路径**:` 后的绝对路径；本仓库内为 `skills/whalecloud-dev-tool-base-scripts`）。
- 所有命令均以 `<BASE_SCRIPTS_DIR>/scripts/<文件名>` 调用（`node` / `python` / `py` 视环境而定）。

## `scripts/` 清单

| 脚本 | 用途 |
|------|------|
| `gnx-tools.js` | GitNexus REST：materialize / read / grep / cypher / search / overview / explore / impact |
| `fetch-arch-data.js` | 拉取架构相关 JSON（REST + MCP），供架构文档生成 |
| `detect-project-kind.js` | 结合 materialize 缓存与 overview 判定工程类型 |
| `get_repo_info.py` | 调 SynapseService `get_repo_info`，解析产品关联仓库列表 |
| `get_doc.py` | 调 SynapseService `get_doc`，下载产品文档 |
| `hybrid_query.py` | 历史工单：混合检索（`--server_url` 等） |
| `relation_query.py` | 历史工单：拓扑关联 |
| `cypher_query.py` | 历史工单：Cypher 查询 |

## `references/` 说明文档

| 文件 | 对应脚本 |
|------|----------|
| [references/README-GNX-TOOLS.md](references/README-GNX-TOOLS.md) | `gnx-tools.js` / `detect-project-kind.js` 用法与验证步骤 |
| [references/get_repo_info_readme.md](references/get_repo_info_readme.md) | `get_repo_info.py` |
| [references/get_doc_readme.md](references/get_doc_readme.md) | `get_doc.py` |
| [references/get_doc.md](references/get_doc.md) | `get_doc` 接口补充说明 |
| [references/hybrid_query.md](references/hybrid_query.md) | `hybrid_query.py` |
| [references/relation_query.md](references/relation_query.md) | `relation_query.py` |
| [references/cypher_query.md](references/cypher_query.md) | `cypher_query.py` |
| [references/gitnexus-remote-mcp.sample.json](references/gitnexus-remote-mcp.sample.json) | 远程 GitNexus MCP（Streamable HTTP）示例配置 |

> 业务技能（如 `whalecloud-dev-tool-arch-create`）的正文与模板中，凡出现 **BASE_SCRIPTS_DIR** 均指本技能目录，**不要**再到业务技能目录下寻找同名 `scripts/`。
