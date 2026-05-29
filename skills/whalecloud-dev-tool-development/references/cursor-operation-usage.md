# Cursor-Operation 脚本使用说明

## 概述

`cursor-operation.py` 脚本通过 PowerShell 调用 Cursor agent，执行代码开发任务。支持命令行调用，实时输出进度到日志文件。

## 命令行调用

```bash
python cursor-operation.py \
  --code-path="./" \
  --target="在当前目录生成一个helloworld.py，实现xxxxx，最终效果yyyyy" \
  --log="1.txt"
```

## 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| `--code-path` | 是 | 代码工作目录 |
| `--target` | 是 | 开发任务描述 |
| `--doc` | 否 | 函数级方案文档路径（有则优先读取） |
| `--log` | 是 | 日志输出文件路径 |
| `--auto-confirm` | 否 | 自动确认危险操作 |
| `--timeout` | 否 | 超时时间（秒），默认 300 |
| `--model` | 否 | Cursor 使用的大模型，默认 Composer 2.5 |

## 使用示例

### 基础用法

```bash
python scripts/cursor-operation.py \
  --code-path="d:/github/openakita/test_dev" \
  --target="在当前目录生成一个helloworld.py，输出 Hello World" \
  --log="d:/github/openakita/test_dev/dev.log"
```

### 结合函数级方案文档

```bash
python scripts/cursor-operation.py \
  --code-path="C:/Users/jetlin/.synapse/work/21881453/code/ZMDB/BackServiceCpp/src/cpp/Zmdb" \
  --doc="C:/Users/jetlin/.synapse/work/21881453/archive/需求设计/func_solution/函数级方案.md" \
  --target="根据函数级方案实现代码" \
  --log="C:/Users/jetlin/.synapse/work/21881453/logs/dev.log"
```

### 自动确认危险操作

```bash
python scripts/cursor-operation.py \
  --code-path="./" \
  --target="删除旧文件并创建新文件" \
  --log="dev.log" \
  --auto-confirm
```

## 日志输出格式

执行过程中，实时写入日志文件：

```log
[2026-05-29 16:30:00] 开始执行任务...
[2026-05-29 16:30:00] 代码目录: d:/github/openakita/test_dev
[2026-05-29 16:30:01] [writeFile] d:/github/openakita/test_dev/helloworld.py
[2026-05-29 16:30:02] [readFile] d:/github/openakita/test_dev/helloworld.py
[2026-05-29 16:30:03] [Bash] git diff
[2026-05-29 16:30:05] 任务执行成功
```

## 依赖环境

- Python 3.11+
- Cursor CLI 已安装并配置到 PATH
- PowerShell 5+

## Python 模块调用

```python
from cursor_operation import CursorCLI, FileProgressLogger

async def main():
    cursor = CursorCLI(
        worktree="d:/github/openakita/test_dev",
        auto_confirm=False,
        timeout=300,
    )

    with FileProgressLogger("dev.log") as logger:
        def on_progress(progress):
            logger.log_progress(progress)

        result = await cursor.agent_stream(
            prompt="在当前目录生成一个helloworld.py，输出 Hello World",
            on_progress=on_progress,
        )

        logger.log("成功" if result.success else f"失败: {result.stderr}")
```

## 主要接口

| 接口 | 说明 |
|------|------|
| `CursorCLI` | Cursor CLI 客户端类 |
| `CursorCLI.agent_stream(prompt, on_progress)` | 流式执行，返回 `CursorResult` |
| `FileProgressLogger` | 进度日志记录器，实时写入文件 |
| `develop_code(doc_path, worktree, ...)` | 便捷函数 |

## 返回值

```python
@dataclass
class CursorResult:
    success: bool      # 执行是否成功
    stdout: str       # 标准输出
    stderr: str        # 错误输出
    exit_code: int     # 退出码
```
