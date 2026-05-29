"""
Cursor CLI 操作脚本

通过 PowerShell 调用 Cursor agent，执行代码开发任务。
支持命令行调用，实时输出进度到日志文件。
"""

import argparse
import asyncio
import json
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional


@dataclass
class ToolEvent:
    tool_type: str
    tool_id: Optional[str] = None
    path: Optional[str] = None
    command: Optional[str] = None
    content: Optional[str] = None


@dataclass
class ProgressEvent:
    timestamp: str
    tool_events: list[ToolEvent] = field(default_factory=list)
    text: Optional[str] = None


@dataclass
class CursorResult:
    success: bool
    stdout: str = ""
    stderr: str = ""
    code: Optional[str] = None
    exit_code: Optional[int] = None


class CursorCLI:
    def __init__(
        self,
        cursor_path: Optional[str] = None,
        worktree: Optional[str] = None,
        auto_confirm: bool = False,
        timeout: int = 300,
        model: Optional[str] = "Composer 2.5",
    ):
        self.cursor_path = cursor_path or "cursor"
        self.worktree = Path(worktree) if worktree else None
        self.auto_confirm = auto_confirm
        self.timeout = timeout
        self.model = model

    def _build_ps_script(self, prompt: str) -> str:
        worktree_arg = f'--worktree "{self.worktree}"' if self.worktree else ""
        auto_confirm_arg = "--dont-ask" if self.auto_confirm else ""
        model_arg = f'--model "{self.model}"' if self.model and self.model.strip() else ""

        parts = [self.cursor_path, "agent"]
        if worktree_arg:
            parts.append(worktree_arg)
        if auto_confirm_arg:
            parts.append(auto_confirm_arg)
        if model_arg:
            parts.append(model_arg)
        parts.append("--output-format")
        parts.append("stream-json")

        cmd_str = " ".join(parts)
        escaped_prompt = prompt.replace("'", "''").replace("\r", "").replace("\n", "`n")

        return f"""
$prompt = @'
{escaped_prompt}
'@
$cmd = '{cmd_str}'
$fullCmd = "$cmd $prompt"
Invoke-Expression $fullCmd
"""

    async def agent_stream(
        self,
        prompt: str,
        on_progress: Optional[Callable[[ProgressEvent], None]] = None,
    ) -> CursorResult:
        script_content = self._build_ps_script(prompt)

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".ps1",
            delete=False,
            encoding="utf-8"
        ) as f:
            f.write(script_content)
            script_path = f.name

        try:
            cmd = [
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-File", script_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.worktree) if self.worktree else None,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout,
            )

            result = CursorResult(
                success=process.returncode == 0,
                stdout=stdout.decode(errors="replace"),
                stderr=stderr.decode(errors="replace"),
                exit_code=process.returncode,
            )

            if on_progress and result.stdout:
                for line in result.stdout.splitlines():
                    if line.strip():
                        try:
                            event = json.loads(line)
                            if event.get("type") == "progress":
                                progress = self._parse_progress_event(event)
                                on_progress(progress)
                        except json.JSONDecodeError:
                            continue

            return result
        finally:
            Path(script_path).unlink(missing_ok=True)

    async def agent(self, prompt: str) -> CursorResult:
        return await self.agent_stream(prompt)

    def _parse_progress_event(self, data: dict) -> ProgressEvent:
        tool_events = []
        for tool in data.get("tool_calls", []):
            tool_events.append(ToolEvent(
                tool_type=tool.get("type", "unknown"),
                tool_id=tool.get("id"),
                path=tool.get("path"),
                command=tool.get("command"),
                content=tool.get("content"),
            ))

        return ProgressEvent(
            timestamp=data.get("timestamp", datetime.now().isoformat()),
            tool_events=tool_events,
            text=data.get("text"),
        )


async def develop_code(
    doc_path: str,
    worktree: str,
    auto_confirm: bool = False,
    timeout: int = 300,
    on_progress: Optional[Callable[[ProgressEvent], None]] = None,
) -> CursorResult:
    """
    根据函数级方案文档开发代码

    Args:
        doc_path: 函数级方案文档路径
        worktree: 代码工作目录
        auto_confirm: 是否自动确认危险操作
        timeout: 超时时间（秒）
        on_progress: 进度回调函数

    Returns:
        CursorResult: 执行结果
    """
    cursor = CursorCLI(
        worktree=worktree,
        auto_confirm=auto_confirm,
        timeout=timeout,
    )

    prompt = f"""请阅读函数级方案文档：{doc_path}

然后根据文档描述的函数实现要求，修改代码目录中的源代码。

注意：
1. 直接修改代码目录中的文件
2. 不要提交代码
3. 完成后输出已修改的文件列表
"""

    return await cursor.agent_stream(prompt, on_progress)


def parse_progress_line(line: str) -> Optional[ProgressEvent]:
    """解析进度行"""
    try:
        data = json.loads(line)
        if data.get("type") == "progress":
            tool_events = []
            for tool in data.get("tool_calls", []):
                tool_events.append(ToolEvent(
                    tool_type=tool.get("type", "unknown"),
                    tool_id=tool.get("id"),
                    path=tool.get("path"),
                    command=tool.get("command"),
                    content=tool.get("content"),
                ))
            return ProgressEvent(
                timestamp=data.get("timestamp", datetime.now().isoformat()),
                tool_events=tool_events,
                text=data.get("text"),
            )
    except json.JSONDecodeError:
        pass
    return None


class FileProgressLogger:
    """进度日志记录器，实时写入文件"""

    def __init__(self, log_path: str):
        self.log_path = Path(log_path)
        self.log_file = None

    def __enter__(self):
        self.log_file = open(self.log_path, "w", encoding="utf-8")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.log_file:
            self.log_file.close()

    def log(self, message: str):
        """写入日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] {message}\n"
        self.log_file.write(line)
        self.log_file.flush()

    def log_progress(self, progress: ProgressEvent):
        """记录进度事件"""
        for tool in progress.tool_events:
            if tool.path:
                self.log(f"[{tool.tool_type}] {tool.path}")
            elif tool.command:
                self.log(f"[{tool.tool_type}] {tool.command}")
            else:
                self.log(f"[{tool.tool_type}]")


async def main():
    parser = argparse.ArgumentParser(description="Cursor CLI 操作工具")
    parser.add_argument("--code-path", required=True, help="代码工作目录")
    parser.add_argument("--target", required=True, help="开发任务描述")
    parser.add_argument("--doc", default=None, help="函数级方案文档路径（可选）")
    parser.add_argument("--log", required=True, help="日志输出文件路径")
    parser.add_argument("--auto-confirm", action="store_true", help="自动确认危险操作")
    parser.add_argument("--timeout", type=int, default=300, help="超时时间（秒）")
    parser.add_argument("--model", default="Composer 2.5", help="Cursor 使用的大模型（如 claude-3-5-sonnet、gpt-4o），默认 Composer 2.5")

    args = parser.parse_args()

    cursor = CursorCLI(
        worktree=args.code_path,
        auto_confirm=args.auto_confirm,
        timeout=args.timeout,
        model=args.model,
    )

    if args.doc:
        prompt = f"""请阅读函数级方案文档：{args.doc}

然后根据文档描述的函数实现要求，修改代码目录中的源代码。

任务目标：{args.target}

注意：
1. 直接修改代码目录中的文件
2. 不要提交代码
3. 完成后输出已修改的文件列表
"""
    else:
        prompt = f"""任务目标：{args.target}

请在代码目录 {args.code_path} 中实现上述任务。

注意：
1. 直接修改代码目录中的文件
2. 不要提交代码
3. 完成后输出已修改的文件列表
"""

    with FileProgressLogger(args.log) as logger:
        def on_progress(progress: ProgressEvent):
            logger.log_progress(progress)

        logger.log(f"开始执行任务...")
        logger.log(f"代码目录: {args.code_path}")
        logger.log(f"日志文件: {args.log}")

        result = await cursor.agent_stream(prompt, on_progress)

        if result.success:
            logger.log("任务执行成功")
        else:
            logger.log(f"任务执行失败: {result.stderr}")

    print(f"执行完成，日志已写入: {args.log}")
    return 0 if result.success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)