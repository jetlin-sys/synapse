"""会议室工具 handler 注册与 session 绑定。"""

from __future__ import annotations

from unittest.mock import MagicMock

from synapse.rd_meeting.agent_session import (
    bind_meeting_agent_session,
    clear_meeting_agent_session,
    ensure_host_session,
    host_session_id,
)
from synapse.tools.handlers.meeting_room import create_meeting_room_handler


def test_create_meeting_room_handler_registers_tool():
    agent = MagicMock()
    agent.handler_registry = __import__(
        "synapse.tools.handlers", fromlist=["SystemHandlerRegistry"]
    ).SystemHandlerRegistry()
    handle = create_meeting_room_handler(agent)
    agent.handler_registry.register("meeting_room", handle)
    assert agent.handler_registry.has_tool("submit_meeting_work_plan")


def test_host_session_id_and_bind():
    sid = host_session_id("room-abc")
    assert sid == "rd_meeting:room-abc:host"
    session = ensure_host_session("room-abc", "default")
    assert session.id == sid
    assert session.context.agent_profile_id == "default"

    agent = MagicMock()
    agent.agent_state = MagicMock()
    bind_meeting_agent_session(agent, session)
    assert agent._current_session is session
    assert agent._current_session_id == sid
    clear_meeting_agent_session(agent)
    assert agent._current_session is None
