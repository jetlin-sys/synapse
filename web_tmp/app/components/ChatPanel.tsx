import React, { useState, useRef, useEffect } from 'react';
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Space,
  Tag,
  Typography,
  type MenuProps,
} from 'antd';
import {
  Send,
  User,
  Sparkles,
  Paperclip,
  MoreHorizontal,
  Cpu,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Link,
  Tag as TagIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Target,
  Zap,
  Plus,
} from 'lucide-react';

const { Text } = Typography;

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

interface Topic {
  title: string;
  status: 'done' | 'ongoing' | 'todo';
  action: string;
  goal: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'ai',
    text: '你好！我是您的研发助手，可以帮助您解析工单、检索知识库、生成代码方案等。今天需要处理哪些任务？',
    time: '10:00',
  },
  {
    id: '2',
    sender: 'user',
    text: '请帮我看一下 [ISSUE-2024] 购物车计算折扣时偶发的精度丢失问题，分析相关代码并提供解决方案。',
    time: '10:01',
  },
  {
    id: '3',
    sender: 'ai',
    text: '收到，正在为您分析购物车折扣计算相关的代码逻辑，并关联历史类似工单与最佳实践知识库...',
    time: '10:01',
  },
  {
    id: '4',
    sender: 'ai',
    text: '已完成初步检索：\n\n1. 发现与 ISSUE-1988（订单金额统计报表尾差修复）高度相似，匹配度 92%\n2. 命中研发规范库《Java 后端编码规范》第 4.2 节\n3. 已定位到 CartServiceImpl.java 中 calculateDiscount 方法存在浮点数精度风险\n\n正在生成 BigDecimal 重构方案，请关注右侧进度面板。',
    time: '10:02',
  },
];

const TOPICS: Topic[] = [
  {
    title: '需求模糊点和需求歧义确认',
    status: 'done',
    action: '解析当前 PRD 中的不确定性描述',
    goal: '输出《模糊点澄清清单》',
  },
  {
    title: '需求边界确认',
    status: 'done',
    action: '圈定本次迭代涉及的功能范围',
    goal: '确保开发范围不溢出',
  },
  {
    title: '需求模块功能确认',
    status: 'ongoing',
    action: '逐项对齐核心模块的功能细节',
    goal: '达成功能实现一致性',
  },
  {
    title: '需求验收标准确认',
    status: 'todo',
    action: '制定每个需求的测试通过准则',
    goal: '形成可量化的验收文档',
  },
  {
    title: '需求风险确认',
    status: 'todo',
    action: '预判技术瓶颈与第三方依赖',
    goal: '提前识别阻塞点并制定预案',
  },
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(2);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: '正在为您更新右侧面板的执行进度，请稍候查看详情分析结果。',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  const menuItems: MenuProps['items'] = [
    { key: 'copy-link', label: '复制工单链接', icon: <Link size={13} /> },
    { key: 'copy-chat', label: '复制对话记录', icon: <Copy size={13} /> },
    { key: 'export', label: '导出对话', icon: <Download size={13} /> },
    { key: 'reset', label: '重置对话', icon: <RefreshCw size={13} /> },
    { type: 'divider' },
    { key: 'clear', label: '清空对话', icon: <Trash2 size={13} />, danger: true },
  ];

  const doneCount = TOPICS.filter((t) => t.status === 'done').length;
  const ongoingCount = TOPICS.filter((t) => t.status === 'ongoing').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#161822',
        position: 'relative',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          background: '#1a1d2e',
          zIndex: 30,
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            overflow: 'hidden',
            flexWrap: 'nowrap',
            minWidth: 0,
          }}
        >
          <Tag
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
              marginInlineEnd: 0,
            }}
          >
            <TagIcon size={10} />
            需求
          </Tag>
          <Tag
            style={{
              background: 'rgba(51, 65, 85, 0.5)',
              color: '#94a3b8',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              fontSize: 11,
              fontFamily: 'monospace',
              flexShrink: 0,
              marginInlineEnd: 0,
            }}
          >
            #REQ-20240312
          </Tag>
          <Text
            style={{
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
          >
            用户中心登录模块安全性升级优化
          </Text>
          {/* Topics toggle button */}
          <button
            onClick={() => setIsTopicsExpanded(!isTopicsExpanded)}
            style={{
              flexShrink: 0,
              background: isTopicsExpanded
                ? 'rgba(168, 85, 247, 0.12)'
                : 'rgba(51, 65, 85, 0.3)',
              border: `1px solid ${isTopicsExpanded ? 'rgba(168, 85, 247, 0.4)' : 'rgba(51, 65, 85, 0.5)'}`,
              color: isTopicsExpanded ? '#c084fc' : '#94a3b8',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 26,
              padding: '0 8px',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={11} color={isTopicsExpanded ? '#c084fc' : '#64748b'} />
            <span>会议议题</span>
            <span
              style={{
                opacity: 0.7,
                paddingLeft: 5,
                borderLeft: '1px solid currentColor',
                marginLeft: 1,
                lineHeight: 1,
              }}
            >
              {doneCount + ongoingCount}/{TOPICS.length}
            </span>
            {isTopicsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreHorizontal size={20} />}
            style={{
              color: '#64748b',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }}
          />
        </Dropdown>
      </div>

      {/* ── Body (topics overlay + messages) ─────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Topics Overlay Panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            transition: 'opacity 0.25s ease, transform 0.25s ease, visibility 0.25s',
            background: 'rgba(26, 29, 46, 0.5)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            opacity: isTopicsExpanded ? 1 : 0,
            visibility: isTopicsExpanded ? 'visible' : 'hidden',
            transform: isTopicsExpanded ? 'translateY(0)' : 'translateY(-10px)',
            pointerEvents: isTopicsExpanded ? 'auto' : 'none',
          }}
        >
          <div
            style={{
              padding: '12px 16px 14px',
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Text
                style={{ fontSize: 11, color: '#64748b', fontWeight: 500, letterSpacing: '0.04em' }}
              >
                会议议题清单
              </Text>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: 'rgba(51, 65, 85, 0.4)',
                }}
              />
              <Tag
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#a78bfa',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  fontSize: 10,
                  marginInlineEnd: 0,
                }}
              >
                需求阶段
              </Tag>
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {TOPICS.map((item, index) => {
                const isActive = item.status === 'ongoing';
                const isSelected = selectedTopic === index;
                const isDone = item.status === 'done';

                return (
                  <li key={index}>
                    <div
                      onClick={() => setSelectedTopic(isSelected ? null : index)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '7px 8px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isActive
                          ? 'rgba(168, 85, 247, 0.08)'
                          : isSelected
                          ? 'rgba(51, 65, 85, 0.12)'
                          : 'transparent',
                        border: isActive
                          ? '1px solid rgba(168, 85, 247, 0.2)'
                          : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        {isDone ? (
                          <CheckCircle2 size={15} color="#475569" />
                        ) : isActive ? (
                          <Circle size={15} color="#c084fc" />
                        ) : (
                          <Circle size={15} color="#3f4a5e" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            display: 'block',
                            color: isDone ? '#64748b' : isActive ? '#c084fc' : '#cbd5e1',
                            fontWeight: isActive ? 500 : 400,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {index + 1}. {item.title}
                        </Text>
                      </div>
                      {isActive && (
                        <Tag
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            fontSize: 10,
                            marginInlineEnd: 0,
                            flexShrink: 0,
                          }}
                        >
                          进行中
                        </Tag>
                      )}
                      {isDone && (
                        <Tag
                          style={{
                            background: 'rgba(51, 65, 85, 0.2)',
                            color: '#475569',
                            border: '1px solid rgba(51, 65, 85, 0.3)',
                            fontSize: 10,
                            marginInlineEnd: 0,
                            flexShrink: 0,
                          }}
                        >
                          已完成
                        </Tag>
                      )}
                    </div>
                    {/* Expanded detail */}
                    {isSelected && (
                      <div
                        style={{
                          marginLeft: 25,
                          marginTop: 4,
                          marginBottom: 6,
                          padding: '8px 12px',
                          background: 'rgba(15, 20, 35, 0.25)',
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                          borderRadius: 8,
                          border: '1px solid rgba(51, 65, 85, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <Space size={6} align="flex-start">
                          <Zap size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                              主要动作：
                            </Text>
                            <Text style={{ fontSize: 11, color: '#e2e8f0', marginLeft: 4 }}>
                              {item.action}
                            </Text>
                          </div>
                        </Space>
                        <Space size={6} align="flex-start">
                          <Target size={11} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                              会议目标：
                            </Text>
                            <Text style={{ fontSize: 11, color: '#e2e8f0', marginLeft: 4 }}>
                              {item.goal}
                            </Text>
                          </div>
                        </Space>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 8px',
            background: '#131520',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  maxWidth: '86%',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Avatar
                  size={32}
                  style={{
                    background: msg.sender === 'user' ? '#2563eb' : '#7c3aed',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 22,
                  }}
                  icon={msg.sender === 'user' ? <User size={15} /> : <Cpu size={15} />}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      marginBottom: 5,
                      paddingInline: 4,
                      fontWeight: 500,
                      color: msg.sender === 'user' ? '#60a5fa' : '#a78bfa',
                    }}
                  >
                    {msg.sender === 'user' ? '弘康' : '需求会议助手'}
                  </Text>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 16,
                      borderTopRightRadius: msg.sender === 'user' ? 4 : 16,
                      borderTopLeftRadius: msg.sender === 'user' ? 16 : 4,
                      background: msg.sender === 'user' ? '#2563eb' : '#1e2133',
                      border:
                        msg.sender === 'user'
                          ? 'none'
                          : '1px solid rgba(51, 65, 85, 0.5)',
                    }}
                  >
                    <Text
                      style={{
                        color: msg.sender === 'user' ? '#ffffff' : '#e2e8f0',
                        fontSize: 13,
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                      }}
                    >
                      {msg.text}
                    </Text>
                  </div>
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#475569',
                      marginTop: 5,
                      paddingInline: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    {msg.time}
                  </Text>
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Participants Bar */}
        <div
          style={{
            flexShrink: 0,
            padding: '6px 12px 6px 16px',
            background: '#161822',
            borderTop: '1px solid rgba(51, 65, 85, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* Scrollable participant tags */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              minWidth: 0,
              paddingRight: 8,
              scrollbarWidth: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px 0 4px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 20,
                cursor: 'default',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={11} color="white" />
              </div>
              <Text style={{ fontSize: 12, color: '#93c5fd' }}>弘康</Text>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px 0 4px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 20,
                cursor: 'default',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cpu size={11} color="white" />
              </div>
              <Text style={{ fontSize: 12, color: '#c4b5fd' }}>需求会议助手</Text>
            </div>
          </div>

          {/* Vertical divider */}
          <div
            style={{
              flexShrink: 0,
              width: 1,
              height: 20,
              background: 'rgba(51, 65, 85, 0.6)',
              marginRight: 8,
            }}
          />

          {/* Add participant button */}
          <button
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px dashed rgba(100, 116, 139, 0.5)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'border-color 0.2s, color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139, 92, 246, 0.6)';
              (e.currentTarget as HTMLButtonElement).style.color = '#a78bfa';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139, 92, 246, 0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(100, 116, 139, 0.5)';
              (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            title="添加参与者"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* ── Input Area ────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 16px 14px',
          background: '#1a1d2e',
          borderTop: '1px solid rgba(51, 65, 85, 0.5)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            background: '#12141e',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: 12,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          <Button
            type="text"
            icon={<Paperclip size={17} />}
            style={{
              color: '#64748b',
              padding: '8px 12px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              height: 'auto',
            }}
          />
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的指令，如：帮我分析相关知识库或生成代码..."
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 5 }}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#e2e8f0',
              resize: 'none',
              padding: '10px 4px',
              fontSize: 13,
            }}
          />
          <Button
            type="text"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            icon={<Send size={17} />}
            style={{
              color: inputValue.trim() ? '#60a5fa' : '#475569',
              padding: '8px 12px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              height: 'auto',
              transition: 'color 0.2s',
            }}
          />
        </div>
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Text style={{ fontSize: 11, color: '#3f4a5e' }}>
            按下{' '}
            <kbd
              style={{
                padding: '1px 5px',
                background: 'rgba(51, 65, 85, 0.4)',
                borderRadius: 4,
                border: '1px solid rgba(51, 65, 85, 0.5)',
                fontFamily: 'monospace',
                fontSize: 10,
                color: '#64748b',
              }}
            >
              Enter
            </kbd>{' '}
            发送，{' '}
            <kbd
              style={{
                padding: '1px 5px',
                background: 'rgba(51, 65, 85, 0.4)',
                borderRadius: 4,
                border: '1px solid rgba(51, 65, 85, 0.5)',
                fontFamily: 'monospace',
                fontSize: 10,
                color: '#64748b',
              }}
            >
              Shift+Enter
            </kbd>{' '}
            换行
          </Text>
        </div>
      </div>
    </div>
  );
}