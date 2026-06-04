import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Tag, Button, Space, Tabs } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code,
  Database,
  BrainCircuit,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  Play,
  Activity,
  Bug,
  Wrench,
  X,
  Check,
  Circle,
  ChevronRight,
} from 'lucide-react';

const { Text, Title } = Typography;

type ItemStatus = 'completed' | 'processing' | 'pending';

interface PlanItem {
  id: number;
  name: string;
  tool: string;
  status: ItemStatus;
  duration: string;
}

interface StepData {
  id: number;
  title: string;
  status: ItemStatus;
  icon: React.ElementType;
  time: string;
  plan: PlanItem[];
}

const INITIAL_STEPS: StepData[] = [
  {
    id: 1,
    title: '需求会议助手',
    status: 'completed',
    icon: FileText,
    time: '2.4s',
    plan: [
      { id: 1, name: '解析需求意图', tool: 'text_parser', status: 'completed', duration: '0.4s' },
      { id: 2, name: '生成会议纪要', tool: 'doc_gen', status: 'completed', duration: '0.8s' },
      { id: 3, name: '拆解子任务', tool: 'task_splitter', status: 'completed', duration: '1.2s' },
    ],
  },
  {
    id: 2,
    title: '架构分析助手',
    status: 'completed',
    icon: Database,
    time: '3.1s',
    plan: [
      { id: 1, name: '检索知识图谱', tool: 'graph_db', status: 'completed', duration: '0.2s' },
      { id: 2, name: '分析时序逻辑', tool: 'logic_analyzer', status: 'completed', duration: '1.6s' },
      { id: 3, name: '定义契约规范', tool: 'spec_tool', status: 'completed', duration: '1.3s' },
    ],
  },
  {
    id: 3,
    title: '代码实现助手',
    status: 'processing',
    icon: Code,
    time: '进行中',
    plan: [
      { id: 1, name: '扫描源码结构', tool: 'ast_loader', status: 'completed', duration: '1.1s' },
      { id: 2, name: '生成业务逻辑', tool: 'logic_gen', status: 'processing', duration: '进行中' },
      { id: 3, name: '执行代码重构', tool: 'refactor_tool', status: 'pending', duration: '-' },
    ],
  },
  {
    id: 4,
    title: '质量保障助手',
    status: 'pending',
    icon: Bug,
    time: '-',
    plan: [
      { id: 1, name: '执行单元测试', tool: 'jest_runner', status: 'pending', duration: '-' },
      { id: 2, name: '扫描代码漏洞', tool: 'security_scanner', status: 'pending', duration: '-' },
      { id: 3, name: '生成测试报告', tool: 'report_gen', status: 'pending', duration: '-' },
    ],
  },
];

// Helper: immutably update a plan item's status/duration
function updatePlanItem(
  steps: StepData[],
  stepId: number,
  itemId: number,
  patch: Partial<PlanItem>
): StepData[] {
  return steps.map((s) =>
    s.id !== stepId
      ? s
      : { ...s, plan: s.plan.map((p) => (p.id !== itemId ? p : { ...p, ...patch })) }
  );
}

function updateStep(steps: StepData[], stepId: number, patch: Partial<StepData>): StepData[] {
  return steps.map((s) => (s.id !== stepId ? s : { ...s, ...patch }));
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

function PlanItemRow({ item }: { item: PlanItem }) {
  const isCompleted = item.status === 'completed';
  const isProcessing = item.status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        borderRadius: 6,
        background: isProcessing
          ? 'rgba(59, 130, 246, 0.07)'
          : isCompleted
          ? 'rgba(34, 197, 94, 0.04)'
          : 'transparent',
        border: `1px solid ${
          isProcessing
            ? 'rgba(59, 130, 246, 0.25)'
            : isCompleted
            ? 'rgba(34, 197, 94, 0.15)'
            : 'rgba(51, 65, 85, 0.25)'
        }`,
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      {/* Status icon */}
      <div style={{ flexShrink: 0, width: 18, display: 'flex', justifyContent: 'center' }}>
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Check size={14} color="#34d399" strokeWidth={2.5} />
          </motion.div>
        )}
        {isProcessing && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            style={{ display: 'flex' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="rgba(96,165,250,0.25)" strokeWidth="2" />
              <path
                d="M7 1.5 A5.5 5.5 0 0 1 12.5 7"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        )}
        {item.status === 'pending' && <Circle size={14} color="#334155" strokeWidth={1.5} />}
      </div>

      {/* Name */}
      <Text
        style={{
          flex: 1,
          color: isCompleted ? '#cbd5e1' : isProcessing ? '#93c5fd' : '#475569',
          fontSize: 12,
          transition: 'color 0.4s',
        }}
      >
        {item.name}
      </Text>

      {/* Tool badge */}
      <span
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          padding: '1px 7px',
          borderRadius: 4,
          background: isProcessing
            ? 'rgba(59, 130, 246, 0.15)'
            : 'rgba(51, 65, 85, 0.35)',
          color: isProcessing ? '#93c5fd' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          transition: 'background 0.4s, color 0.4s',
        }}
      >
        <Wrench size={9} />
        {item.tool}
      </span>

      {/* Duration */}
      <Text
        style={{
          color: isCompleted ? '#34d399' : isProcessing ? '#60a5fa' : '#334155',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          width: 44,
          textAlign: 'right',
          flexShrink: 0,
          transition: 'color 0.4s',
        }}
      >
        {item.duration}
      </Text>
    </motion.div>
  );
}

// Pulsing ring overlay for working card
function PulsingRing() {
  return (
    <motion.div
      animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.04, 1] }}
      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: -1,
        borderRadius: 8,
        border: '1.5px solid rgba(59, 130, 246, 0.55)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

// Animated dots for "working" label
function WorkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: 'easeInOut' }}
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#60a5fa',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

// ────────────────────────────────────────────────────��─────
// Main component
// ──────────────────────────────────────────────────────────

interface RequirementMeetingAgentProps {
  steps: StepData[];
  selectedId: number | null;
  handleCardClick: (id: number) => void;
  setSelectedId: (id: number | null) => void;
}

export function RequirementMeetingAgent({
  steps,
  selectedId,
  handleCardClick,
  setSelectedId,
}: RequirementMeetingAgentProps) {
  const selectedStep = steps.find((s) => s.id === selectedId) ?? null;
  const [activeTab, setActiveTab] = useState<string>('kb');

  // 当外部选中的智能体变化时，自动切换到最相关的 Tab
  useEffect(() => {
    if (selectedStep) {
      if (selectedStep.id === 1) setActiveTab('kb');
      else if (selectedStep.id === 2) setActiveTab('kg');
      else setActiveTab('code');
    }
  }, [selectedId]);

  const tabItems = [
    {
      key: 'kb',
      label: (
        <Space size={6}>
          <FileText size={14} />
          <span>知识库检索</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 10,
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Tag color="blue" bordered={false} style={{ fontSize: 11 }}>历史相似工单 (RAG)</Tag>
                <Text style={{ color: '#818cf8', fontSize: 12, fontWeight: 600 }}>匹配度 92%</Text>
              </div>
              <Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>
                FIX: 订单金额总计与实际支付出现 0.01 误差
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, display: 'block' }}>
                引用路径：`docs/engineering/finance/precision-loss.md` <br />
                核心结论：浮点数计算导致的资金安全风险，必须强制使用 `BigDecimal` 并指定 `RoundingMode`。
              </Text>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: 10,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Tag color="green" bordered={false} style={{ fontSize: 11 }}>研发规范库</Tag>
                <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 600 }}>置信度 100%</Text>
              </div>
              <Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>
                Java 后端编码规范
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, display: 'block' }}>
                命中条目：严禁使用 `Double/Float` 进行金额计算。所有 `DTO` 和 `Entity` 必须使用 `Decimal` 类型。
              </Text>
            </div>
          </Space>
        </div>
      ),
    },
    {
      key: 'kg',
      label: (
        <Space size={6}>
          <BrainCircuit size={14} />
          <span>知识图谱分析</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ 
            background: 'rgba(129, 140, 248, 0.05)', 
            borderRadius: 12, 
            border: '1px solid rgba(129, 140, 248, 0.1)',
            padding: 20,
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 10px #818cf8' }} />
              <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>正在构建需求实体关联拓扑...</Text>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: '关联服务', value: 'PaymentService', icon: Database },
                { label: '影响模块', value: 'CheckoutFlow', icon: Activity },
                { label: '涉及数据', value: 'OrderPrice', icon: FileText }
              ].map((item, idx) => (
                <div key={idx} style={{ background: '#161925', padding: 12, borderRadius: 8, border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <item.icon size={12} color="#94a3b8" />
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>{item.label}</span>
                  </div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, borderLeft: '2px dashed rgba(129, 140, 248, 0.2)', marginLeft: 3, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Text style={{ color: '#a5b4fc', fontSize: 12 }}>推理路径: Requirement {'->'} OrderEntity {'->'} CurrencyType {'->'} BigDecimalRefactor</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>检测到隐性依赖: 促销引擎(PromotionEngine) 依赖当前计算结果，建议同步检查。</Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: (
        <Space size={6}>
          <Code size={14} />
          <span>代码深度分析</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ 
            background: '#0d0e16', 
            borderRadius: 8, 
            border: '1px solid rgba(51, 65, 85, 0.6)',
            padding: 16,
            fontFamily: 'SFMono-Regular, Consolas, monospace'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
              <Text style={{ color: '#60a5fa', fontSize: 12 }}>CartServiceImpl.java (Analyzing...)</Text>
              <Tag color="error" style={{ fontSize: 10 }}>HIGH RISK</Tag>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text style={{ color: '#475569', fontSize: 12 }}>141 |  // Calculate total with discount</Text>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid #ef4444', padding: '2px 8px' }}>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>142 |  double totalAmount = cart.getItems().stream()</Text>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>143 |    .mapToDouble(i -{'>'} i.getPrice() * i.getQty()).sum();</Text>
              </div>
              <Text style={{ color: '#475569', fontSize: 12 }}>144 | </Text>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid #ef4444', padding: '2px 8px' }}>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>145 |  double discount = totalAmount * coupon.getRate();</Text>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: 'rgba(234, 179, 8, 0.1)', borderRadius: 6, border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <Space align="start" size={8}>
                <Activity size={14} color="#eab308" style={{ marginTop: 2 }} />
                <div>
                  <Text style={{ color: '#fde68a', fontSize: 12, fontWeight: 600, display: 'block' }}>检测到精度截断风险</Text>
                  <Text style={{ color: '#fbbf24', fontSize: 11, display: 'block', marginTop: 2 }}>
                    浮点数运算在进行 `* 0.05` 等操作时会产生无限循环小数，导致分位误差。
                  </Text>
                </div>
              </Space>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        padding: '0 24px 24px 24px',
        overflowY: 'auto',
        background: '#10121b',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="custom-agent-tabs"
        style={{ color: '#94a3b8' }}
      />

      <style>{`
        .custom-agent-tabs .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
        .custom-agent-tabs .ant-tabs-tab {
          padding: 12px 16px !important;
          transition: all 0.3s !important;
        }
        .custom-agent-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #3b82f6 !important;
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.3) !important;
        }
        .custom-agent-tabs .ant-tabs-ink-bar {
          background: #3b82f6 !important;
          height: 3px !important;
          border-radius: 3px 3px 0 0 !important;
        }
        .custom-agent-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important;
        }
      `}</style>
    </div>
  );
}

export function ProcessFlow() {
  const [steps, setSteps] = useState<StepData[]>(INITIAL_STEPS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Simulate async plan progression
  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    // Step 3, item 3: processing → completed at 3.5s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 3, 3, { status: 'completed', duration: '2.3s' })
      );
    }, 3500);

    // Step 3, item 4: pending → processing at 4s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 3, 4, { status: 'processing', duration: '进行中' })
      );
    }, 4000);

    // Step 3, item 4: processing → completed at 7s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 3, 4, { status: 'completed', duration: '3.1s' })
      );
    }, 7000);

    // Step 3 itself: completed at 7.5s
    schedule(() => {
      setSteps((prev) =>
        updateStep(prev, 3, { status: 'completed', time: '8.4s' })
      );
    }, 7500);

    // Step 4: pending → processing at 8s
    schedule(() => {
      setSteps((prev) =>
        updateStep(prev, 4, { status: 'processing', time: '进行中' })
      );
    }, 8000);

    // Step 4, item 1: pending → processing at 8s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 4, 1, { status: 'processing', duration: '进行中' })
      );
    }, 8000);

    // Step 4, item 1: completed at 11s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 4, 1, { status: 'completed', duration: '2.8s' })
      );
    }, 11000);

    // Step 4, item 2: processing at 11.5s
    schedule(() => {
      setSteps((prev) =>
        updatePlanItem(prev, 4, 2, { status: 'processing', duration: '进行中' })
      );
    }, 11500);

    return () => timers.current.forEach(clearTimeout);
  }, []);

  const selectedStep = steps.find((s) => s.id === selectedId) ?? null;

  const handleCardClick = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#12141e',
        overflow: 'hidden',
      }}
    >
      {/* 智能体并发执行集群 */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
          background: '#0f111a',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {steps.map((step) => {
            const Icon = step.icon;
            const isSelected = selectedId === step.id;
            const isProcessing = step.status === 'processing';
            const isCompleted = step.status === 'completed';

            return (
              <motion.button
                key={step.id}
                onClick={() => handleCardClick(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(22, 25, 37, 0.7)',
                  border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(51, 65, 85, 0.4)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: 180,
                  boxShadow: isSelected ? '0 8px 20px rgba(59, 130, 246, 0.15)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 活跃状态背景微动 */}
                {isProcessing && (
                  <motion.div
                    animate={{ opacity: [0.05, 0.1, 0.05] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ position: 'absolute', inset: 0, background: '#3b82f6', pointerEvents: 'none' }}
                  />
                )}
                
                <div style={{ position: 'relative', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(51, 65, 85, 0.3)' }}>
                  <Icon size={16} color={isProcessing ? '#60a5fa' : isSelected ? '#fff' : '#64748b'} />
                </div>

                <div style={{ textAlign: 'left', flex: 1, position: 'relative', zIndex: 1 }}>
                  <div style={{ color: isSelected ? '#fff' : '#e2e8f0', fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{step.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          border: '1.5px solid rgba(59, 130, 246, 0.2)',
                          borderTopColor: '#3b82f6'
                        }} 
                      />
                    ) : (
                      <span 
                        style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          background: isCompleted ? '#10b981' : '#475569',
                        }} 
                      />
                    )}
                    <span style={{ color: isProcessing ? '#60a5fa' : '#64748b', fontSize: 11, fontWeight: 500 }}>
                      {isProcessing ? '正在工作' : isCompleted ? '任务完成' : '待命状态'}
                    </span>
                  </div>
                </div>

                {isCompleted && !isSelected && (
                  <div style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Check size={10} color="#10b981" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 浮动展开的异步执行计划面板 */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 20 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div 
                style={{ 
                  padding: '16px', 
                  background: '#1a1d2e', 
                  borderRadius: 12, 
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Space size={8}>
                    <Wrench size={13} color="#60a5fa" />
                    <Text style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>
                      {steps.find(s => s.id === selectedId)?.title} · 调用明细
                    </Text>
                  </Space>
                  <button 
                    onClick={() => setSelectedId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.find(s => s.id === selectedId)?.plan.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0f111a', borderRadius: 6, border: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      <Space size={12}>
                        {item.status === 'completed' ? (
                          <CheckCircle size={14} color="#10b981" />
                        ) : item.status === 'processing' ? (
                          <Activity size={14} color="#3b82f6" />
                        ) : (
                          <Circle size={14} color="#334155" />
                        )}
                        <Text style={{ color: item.status === 'pending' ? '#475569' : '#e2e8f0', fontSize: 12 }}>
                          {item.name}
                        </Text>
                      </Space>
                      <Space size={16}>
                        <Tag style={{ background: 'rgba(51, 65, 85, 0.4)', color: '#94a3b8', border: 'none', fontSize: 10, marginInlineEnd: 0 }}>
                          {item.tool}
                        </Tag>
                        <Text style={{ color: '#64748b', fontSize: 11, width: 40, textAlign: 'right' }}>
                          {item.duration}
                        </Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable content */}
      <RequirementMeetingAgent
        steps={steps}
        selectedId={selectedId}
        handleCardClick={handleCardClick}
        setSelectedId={setSelectedId}
      />
    </div>
  );
}
