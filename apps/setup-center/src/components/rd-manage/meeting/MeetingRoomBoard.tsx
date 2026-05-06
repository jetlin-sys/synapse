import React, { useState, useEffect, useRef } from 'react';
import { ConfigProvider, theme, Avatar, Modal, Button, Input, Tag, Badge, Tooltip, Progress } from 'antd';
import { RequirementAnalysisPanel } from './panels/RequirementAnalysisPanel';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Cpu, FileText, TerminalSquare, AlertTriangle, ShieldAlert, Sparkles, 
  Users, MessageSquare, CheckCircle2, ChevronRight, Hash, Activity, Send, Zap, 
  Globe, Clock, Coins, BrainCircuit, Coffee, MoreHorizontal, CircleDashed, 
  Terminal, Code2, GitBranch, FileCode2, Play, User, Info, Network, Code, 
  TestTube, CheckSquare, Flame, TrendingUp, Loader2, AlertCircle, MessageSquareText
} from 'lucide-react';

const { darkAlgorithm } = theme;

function useAntThemeDark() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    const t = document.documentElement.getAttribute('data-theme') || 'light';
    return t === 'dark' || t === 'daltonized-dark' || t === 'high-contrast';
  });
  useEffect(() => {
    const read = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'light';
      setDark(t === 'dark' || t === 'daltonized-dark' || t === 'high-contrast');
    };
    read();
    const m = new MutationObserver(read);
    m.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => m.disconnect();
  }, []);
  return dark;
}

// --- Types for Meeting Room ---
type AgentRole = 'coordinator' | 'executor' | 'reviewer' | 'designer' | 'expert';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  icon: React.ReactNode;
}

interface RoomAgent extends Agent {
  status: 'idle' | 'processing' | 'error';
  currentAction: string;
}

interface LogEntry {
  id: string;
  agentId: string;
  text: string;
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'user';
}

interface MeetingRoom {
  id: string;
  ticketId: string;
  ticketTitle: string;
  branch: string;
  stageName: string;
  stageIndex: number;
  currentNode: string;
  totalStages: number;
  status: 'processing' | 'human_intervention' | 'completed';
  stageDuration: string;
  tokenConsumed: number;
  tokenBudget: number;
  agents: RoomAgent[];
  logs: LogEntry[];
  brief: string;
}

// --- SOP Configuration from Workbench ---
type NodeType = 'ai' | 'human' | 'human_start' | 'ai_exception' | 'ai_human' | 'system' | 'human_multi';

interface SOPNode {
  id: string;
  name: string;
  type: NodeType;
  desc: string;
}

interface SOPStage {
  id: number;
  name: string;
  nodes: SOPNode[];
}

const SOP_STAGES: SOPStage[] = [
  {
    id: 0,
    name: '待处理',
    nodes: [
      { id: 'pending', name: '等待调度', type: 'system', desc: '工单刚创建，等待进入智能研发流程' }
    ]
  },
  {
    id: 1,
    name: '需求分析',
    nodes: [
      { id: 'req_clarify', name: '需求澄清', type: 'human', desc: '识别需求模糊点和歧义，自动交互式推进完善' },
      { id: 'boundary', name: '边界确认', type: 'ai', desc: '识别跨产品场景，确保单个需求只处理一个产品' },
      { id: 'module_func', name: '模块功能', type: 'ai', desc: '对需求进行功能模块拆分，为设计做准备' },
      { id: 'acceptance', name: '验收标准', type: 'ai', desc: '针对拆分出的功能模块完成验收要求设定' },
      { id: 'req_risk', name: '需求风险', type: 'human', desc: '高风险需求需人工介入，评估影响和工作量' }
    ]
  },
  {
    id: 2,
    name: '需求设计',
    nodes: [
      { id: 'func_assign', name: '功能点分派', type: 'ai', desc: '按需求拆分功能点，分派给不同智能体并行处理' },
      { id: 'history_solution', name: '历史方案', type: 'ai', desc: '检索历史方案，与当前要求进行映射供参考' },
      { id: 'module_confirm', name: '模块确认', type: 'ai', desc: '确认具体改造的代码模块范围' },
      { id: 'func_solution', name: '函数级方案', type: 'ai', desc: '将功能方案定位到函数级别，严控改造范围' },
      { id: 'entropy_gen', name: '控熵生成', type: 'ai', desc: '提取并生成 agent.md, rule.md 等控熵文件' },
      { id: 'solution_review', name: '方案评审', type: 'ai_human', desc: '发起评审，设计助手答辩，可调用沙箱验证可行性' }
    ]
  },
  {
    id: 3,
    name: '需求研发',
    nodes: [
      { id: 'auto_split', name: '自动拆单', type: 'ai', desc: '根据需求单和方案完成研发子单自动拆分分配' },
      { id: 'sandbox_build', name: '沙箱构建', type: 'ai', desc: '针对研发单构造无冗余信息的基础沙箱环境' },
      { id: 'env_pregen', name: '环境预生成', type: 'ai', desc: '下载代码、控熵文件，完成开发环境预生成' }
    ]
  },
  {
    id: 4,
    name: '开发中',
    nodes: [
      { id: 'task_exec', name: '任务执行', type: 'human_start', desc: '人工确认启动，研发助手关联沙箱执行（禁改Prompt）' },
      { id: 'exception_check', name: '异常检查', type: 'ai', desc: '发现无法解决的问题时，降级为人工介入处理' },
      { id: 'task_feedback', name: '任务反馈', type: 'system', desc: '实时反馈执行情况，供人工观察智能体状态' },
      { id: 'diff_analysis', name: '差异分析', type: 'human', desc: '强制要求研发人员对完成的代码进行差异分析' },
      { id: 'env_start', name: '环境启动', type: 'system', desc: '自动进行环境启动并编译运行代码（或远端编译）' },
      { id: 'unit_test', name: '单元自测', type: 'ai', desc: '根据验收标准生成测试用例，自测通过后自动提交试飞' }
    ]
  },
  {
    id: 5,
    name: '代码走查',
    nodes: [
      { id: 'dev_process_review', name: '开发流程评审', type: 'ai', desc: '检查开发耗时、token消耗、冲突情况等是否合规' },
      { id: 'solution_consistency', name: '方案一致性', type: 'ai', desc: '二次核对涉及的文件/模块/功能是否严遵方案' },
      { id: 'risk_review', name: '风险评审', type: 'ai', desc: '综合评定开发中的情况及测试充分率是否存在风险' },
      { id: 'entropy_review', name: '控熵评审', type: 'ai', desc: '双向校验控熵文件内容与代码改造差异点的各类结构' },
      { id: 'leader_review', name: '研发组长评审', type: 'human_multi', desc: '全员线上评审通过后，方可继续转单发布' }
    ]
  }
];

const ALL_NODES = SOP_STAGES.flatMap(s => s.nodes.map(n => ({ ...n, stageId: s.id })));

const getNodeStateGlobal = (room: MeetingRoom, nodeId: string): 'completed' | 'processing' | 'error' | 'human_intervention' | 'pending' => {
  const targetIndex = ALL_NODES.findIndex(n => n.id === nodeId);
  const currentIndex = ALL_NODES.findIndex(n => n.id === room.currentNode);

  if (targetIndex < currentIndex) return 'completed';
  if (targetIndex > currentIndex) return 'pending';

  // Target is the current node
  if (room.status === 'processing') return 'processing';
  if (room.status === 'human_intervention') {
    const node = ALL_NODES[targetIndex];
    if (node.type.includes('human') || node.type === 'human_multi' || node.type === 'human_start' || node.type === 'ai_exception') {
      return 'human_intervention';
    }
    return 'error';
  }
  return 'pending';
};

// --- Subcomponents for Outputs (from OrderManagement) ---
const TerminalOutput = ({ lines }: { lines: string[] }) => (
  <div className="bg-[#050505] border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-y-auto max-h-64 custom-scrollbar">
    {lines.map((line, i) => (
      <div key={i} className="mb-1">
        <span className="text-emerald-500 mr-2">$</span>
        <span className={line.includes('Error') || line.includes('FATAL') ? 'text-red-400' : line.includes('Warning') || line.includes('WARN') ? 'text-amber-400' : 'text-slate-300'}>
          {line}
        </span>
      </div>
    ))}
  </div>
);

const JsonOutput = ({ data }: { data: any }) => (
  <div className="bg-[#050505] border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-auto max-h-64 custom-scrollbar text-blue-300">
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

const renderNodeOutput = (node: SOPNode, room: MeetingRoom) => {
  const state = getNodeStateGlobal(room, node.id);
  if (state === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500">
        <CircleDashed className="w-10 h-10 mb-3 opacity-50" />
        <p>节点未开始执行，暂无输出产物</p>
      </div>
    );
  }

  const isIntervention = room.status === 'human_intervention' || state === 'human_intervention' || state === 'error';

  switch (node.id) {
    case 'req_clarify':
      return (
        <div className="flex flex-col border border-slate-800 rounded-xl overflow-hidden h-[300px]">
          <div className="bg-slate-900 p-3 border-b border-slate-800 text-sm font-medium text-slate-300 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" /> AI 澄清会话记录
          </div>
          <div className="flex-1 bg-[#0a0a0a] p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="self-start bg-slate-800 text-slate-200 p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-sm">
              发现需求中关于“实时同步”的具体延迟要求不明确，请问期望的同步延迟是在毫秒级还是秒级？
            </div>
            <div className="self-end bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
              期望在500ms以内完成双向同步。
            </div>
          </div>
        </div>
      );
    case 'boundary':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">领域边界分析图谱</h4>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col items-center gap-4">
            <div className="px-4 py-2 bg-indigo-900/40 border border-indigo-500/50 rounded-lg text-indigo-300 text-sm">
              知识库同步模块 (Core)
            </div>
            <div className="h-6 w-0.5 bg-slate-700" />
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-xs">文档解析服务</div>
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-xs">向量检索引擎</div>
            </div>
          </div>
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 已确认边界独立，无跨产品影响</p>
        </div>
      );
    case 'module_func':
    case 'func_assign':
    case 'auto_split':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Network className="w-4 h-4" /> 结构拆分结果</h4>
          <JsonOutput data={{
            modules: [
              { id: "mod_1", name: "Sync Listener", agent: "Agent-Alpha", status: "assigned" },
              { id: "mod_2", name: "Vector Indexer", agent: "Agent-Beta", status: "assigned" }
            ]
          }} />
        </div>
      );
    case 'entropy_gen':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400">生成的控熵文件</h4>
          <div className="grid grid-cols-2 gap-3">
            {['agent.md', 'rule.md', 'skills.md', 'tools.md'].map(file => (
              <div key={file} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-blue-500/50 cursor-pointer transition-colors">
                <FileCode2 className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-slate-300 font-mono">{file}</span>
              </div>
            ))}
          </div>
          {room.status === 'processing' && (
             <div className="mt-4 p-4 border border-blue-900/50 bg-blue-950/20 rounded-xl">
               <div className="text-xs text-blue-400 font-mono mb-2 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating rule.md...</div>
               <pre className="text-xs text-slate-300 font-mono overflow-hidden">
                 <code>{`1. **Latency Requirement**: Sync operations MUST complete within 500ms.\n2. **Data Consistency**: Use Vector DB transactional updates.\n...`}</code>
               </pre>
             </div>
          )}
        </div>
      );
    case 'exception_check':
      if (isIntervention) {
        return (
          <div className="space-y-4">
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium mb-1">沙箱执行异常中断</h4>
                <TerminalOutput lines={[
                  "Executing concurrent load test for 'sync_service'...",
                  "Spawning 50 virtual agents...",
                  "ERROR: FATAL: Agent lock deadlocked in module 'sync_service'.",
                  "ERROR: Mutex 'workflow_mtx' acquired by thread 12 but requested by thread 44.",
                  "WARN: Auto-recovery attempted (1/3) - Failed.",
                  "CRITICAL: Sandbox execution halted. Awaiting human intervention."
                ]} />
              </div>
            </div>
            <Button type="primary" block size="large" className="bg-amber-600 hover:bg-amber-500 border-none">
              降级为人工处理 (关联IDE)
            </Button>
          </div>
        );
      }
      return <TerminalOutput lines={["[INFO] Check passed. No anomalies detected in execution logs.", "Environment synced successfully."]} />;
    case 'sandbox_build':
    case 'env_pregen':
    case 'env_start':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2"><TerminalSquare className="w-4 h-4" /> 环境执行日志</h4>
          <TerminalOutput lines={[
            "Downloading base image ubuntu:22.04...",
            "Extracting layer 1/5...",
            "Extracting layer 5/5...",
            "Cloning repository branch " + room.branch + "...",
            "Applying entropy rules: agent.md, rule.md...",
            "Environment setup completed successfully in 12s."
          ]} />
        </div>
      );
    case 'task_exec':
      if (isIntervention) {
        return (
          <div className="flex flex-col items-center justify-center h-48 bg-blue-950/20 border border-blue-900/50 rounded-xl border-dashed">
            <Play className="w-12 h-12 text-blue-500 mb-4 ml-1" />
            <p className="text-sm text-slate-300 mb-5">环境就绪，等待人工确认启动智能研发任务</p>
            <Button type="primary" size="large" className="bg-blue-600 hover:bg-blue-500 border-none px-8">
              立即启动任务
            </Button>
          </div>
        );
      }
      return <div className="text-sm text-slate-400 bg-slate-900 p-4 rounded-lg">任务已启动并由系统接管。</div>;
    case 'unit_test':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2"><TestTube className="w-4 h-4" /> 单元测试结果</h4>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-300">测试覆盖率</span>
              <span className="text-green-400 font-mono">94.2%</span>
            </div>
            <Progress percent={94.2} strokeColor="#4ade80" trailColor="#1e293b" showInfo={false} />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-green-500" /> test_vector_sync.py (Passed)</div>
              <div className="flex items-center gap-2 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-green-500" /> test_db_listener.py (Passed)</div>
            </div>
          </div>
        </div>
      );
    case 'leader_review':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-400">审批人列表</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar className="bg-blue-500">张</Avatar>
                <div>
                  <div className="text-sm text-slate-200">张三 (架构师)</div>
                  <div className="text-xs text-slate-500">代码架构规范审查</div>
                </div>
              </div>
              {isIntervention ? <Badge status="warning" text="审核中" /> : <Badge status="success" text="已通过" />}
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar className="bg-purple-500">李</Avatar>
                <div>
                  <div className="text-sm text-slate-200">李四 (研发组长)</div>
                  <div className="text-xs text-slate-500">业务逻辑综合审查</div>
                </div>
              </div>
              {isIntervention ? (
                 <Button type="primary" size="small" className="bg-blue-600 text-xs border-none">通过转单</Button>
              ) : (
                 <Badge status="success" text="已通过" />
              )}
            </div>
          </div>
          
          {/* Diff preview for leader_review when intervention is needed */}
          {isIntervention && (
            <div className="mt-4 border border-slate-800 rounded-lg overflow-hidden">
               <div className="bg-slate-900 px-3 py-2 text-xs text-slate-400 border-b border-slate-800 flex items-center gap-2"><Code className="w-3.5 h-3.5"/> 冲突代码片段 (Branch B)</div>
               <pre className="p-3 text-xs font-mono text-slate-300 bg-[#050505] overflow-x-auto">
{`@@ -15,7 +15,7 @@
 describe('Test Branch B', () => {
   it('should mock correctly', () => {
-    const mockObj = { returnData: null };
+    const mockObj = { returnData: null, throwError: true }; // Conflicting logic
     expect(process(mockObj)).toThrow();
   });
 });`}
               </pre>
            </div>
          )}
        </div>
      );
    default:
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Activity className="w-4 h-4" /> AI 处理分析报告</h4>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
            <p className="mt-2 text-slate-500">该环节由智能体自动分析完成，已生成标准结构化输出并传递给下游节点。详细日志已归档至系统存储区。</p>
          </div>
        </div>
      );
  }
};


// --- Mock Data ---
const MOCK_BASE_AGENTS: Record<string, Agent> = {
  alpha: { id: 'alpha', name: 'Alpha', role: '研发主控', avatarColor: 'bg-blue-600', icon: <Bot className="w-4 h-4" /> },
  beta: { id: 'beta', name: 'Beta', role: '沙箱执行', avatarColor: 'bg-indigo-600', icon: <Cpu className="w-4 h-4" /> },
  gamma: { id: 'gamma', name: 'Gamma', role: '代码评审', avatarColor: 'bg-purple-600', icon: <TerminalSquare className="w-4 h-4" /> },
  delta: { id: 'delta', name: 'Delta', role: '方案设计', avatarColor: 'bg-cyan-600', icon: <Sparkles className="w-4 h-4" /> },
  epsilon: { id: 'epsilon', name: 'Epsilon', role: '领域专家', avatarColor: 'bg-teal-600', icon: <Globe className="w-4 h-4" /> },
};

const INITIAL_ROOMS: MeetingRoom[] = [
  {
    id: 'room-1',
    ticketId: 'TICKET-2026-0413-001',
    ticketTitle: '智能研发助手核心调度模块',
    branch: 'feature/ai-assistant-core',
    stageName: '开发中',
    stageIndex: 4,
    currentNode: 'exception_check',
    totalStages: 6,
    status: 'human_intervention',
    stageDuration: '45m 12s',
    tokenConsumed: 125400,
    tokenBudget: 150000,
    agents: [
      { ...MOCK_BASE_AGENTS.alpha, status: 'error', currentAction: '等待人工决策' },
      { ...MOCK_BASE_AGENTS.beta, status: 'idle', currentAction: '沙箱已挂起' },
      { ...MOCK_BASE_AGENTS.gamma, status: 'error', currentAction: '死锁原因排查中' }
    ],
    brief: '发现并发锁死异常，请求人工排查调度超时逻辑。',
    logs: [
      { id: '1', agentId: 'alpha', text: '已分配研发任务：核心调度模块开发，启动沙箱环境。', timestamp: '10:00:00', type: 'info' },
      { id: '2', agentId: 'beta', text: '沙箱环境构建成功，正在加载依赖。', timestamp: '10:02:15', type: 'success' },
      { id: '3', agentId: 'beta', text: '环境加载完成，开始执行并发控制脚本。', timestamp: '10:15:30', type: 'info' },
      { id: '4', agentId: 'gamma', text: '检测到运行时死锁，Agent lock deadlocked in module "sync_service".', timestamp: '10:45:12', type: 'error' },
      { id: '5', agentId: 'alpha', text: '尝试自动恢复失败，已降级，请求人类专家介入排查同步逻辑。', timestamp: '10:45:15', type: 'warning' }
    ]
  },
  {
    id: 'room-2',
    ticketId: 'TICKET-2026-0413-002',
    ticketTitle: '产品知识库实时同步策略',
    branch: 'feature/knowledge-base-sync',
    stageName: '需求设计',
    stageIndex: 2,
    currentNode: 'entropy_gen',
    totalStages: 6,
    status: 'processing',
    stageDuration: '12m 05s',
    tokenConsumed: 45200,
    tokenBudget: 80000,
    agents: [
      { ...MOCK_BASE_AGENTS.delta, status: 'processing', currentAction: '生成控熵文件中...' },
      { ...MOCK_BASE_AGENTS.epsilon, status: 'processing', currentAction: '检索历史最佳实践...' }
    ],
    brief: '正在生成函数级方案并映射历史代码，当前进度 85%。',
    logs: [
      { id: '1', agentId: 'epsilon', text: '领域模型提取完毕，知识库边界确认清晰。', timestamp: '11:00:00', type: 'success' },
      { id: '2', agentId: 'delta', text: '开始进行功能点拆分及历史方案检索。', timestamp: '11:05:00', type: 'info' },
      { id: '3', agentId: 'epsilon', text: '检索到历史相似策略 v1.2，正在对齐最新架构。', timestamp: '11:15:00', type: 'info' },
      { id: '4', agentId: 'delta', text: '开始构建 rule.md 与 agent.md 规范约束。', timestamp: '11:20:00', type: 'info' }
    ]
  },
  {
    id: 'room-3',
    ticketId: 'TICKET-2026-0413-004',
    ticketTitle: '单元测试样例自生成增强',
    branch: 'feature/auto-unit-test-gen',
    stageName: '代码走查',
    stageIndex: 5,
    currentNode: 'leader_review',
    totalStages: 6,
    status: 'human_intervention',
    stageDuration: '1h 20m',
    tokenConsumed: 89000,
    tokenBudget: 100000,
    agents: [
      { ...MOCK_BASE_AGENTS.alpha, status: 'idle', currentAction: '等待评审反馈' },
      { ...MOCK_BASE_AGENTS.gamma, status: 'error', currentAction: '等待人类确认冲突' }
    ],
    brief: '复杂分支逻辑的MOCK生成存在代码冲突，需要人工确认。',
    logs: [
      { id: '1', agentId: 'alpha', text: '单元测试覆盖率评估中...', timestamp: '14:00:00', type: 'info' },
      { id: '2', agentId: 'gamma', text: '走查发现：MOCK对象在分支B未正确返回异常断言。', timestamp: '14:30:00', type: 'warning' },
      { id: '3', agentId: 'alpha', text: '尝试重写MOCK对象失败，存在类型冲突。', timestamp: '14:35:00', type: 'error' },
      { id: '4', agentId: 'gamma', text: '重写会导致循环依赖风险。请研发组长/开发人员确认重写逻辑。', timestamp: '14:36:00', type: 'warning' }
    ]
  },
  {
    id: 'room-4',
    ticketId: 'TICKET-2026-0430-005',
    ticketTitle: 'AI 工单智能路由与优先级排序',
    branch: 'feature/intelligent-ticket-routing',
    stageName: '需求分析',
    stageIndex: 1,
    currentNode: 'module_func',
    totalStages: 6,
    status: 'processing',
    stageDuration: '18m 44s',
    tokenConsumed: 32800,
    tokenBudget: 60000,
    agents: [
      { ...MOCK_BASE_AGENTS.delta, status: 'processing', currentAction: '执行功能模块拆分...' },
      { ...MOCK_BASE_AGENTS.epsilon, status: 'idle', currentAction: '需求澄清已完成，等待下游' },
      { ...MOCK_BASE_AGENTS.alpha, status: 'processing', currentAction: '并行生成验收标准草稿...' }
    ],
    brief: '需求澄清与边界确认已完成，正在进行功能模块拆分。',
    logs: [
      { id: '1', agentId: 'epsilon', text: '工单已接收，开始解析需求文档，发起需求澄清会话。', timestamp: '09:00:00', type: 'info' },
      { id: '2', agentId: 'epsilon', text: '检测到歧义点：「智能路由」未明确是基于规则引擎还是 ML 模型，已向产品侧发起确认。', timestamp: '09:01:30', type: 'warning' },
      { id: '3', agentId: 'epsilon', text: '产品确认：采用规则引擎 + 轻量 ML 双轨并行，延迟要求 < 200ms。需求澄清完成。', timestamp: '09:08:45', type: 'success' },
      { id: '4', agentId: 'delta', text: '领域边界分析完成：路由模块独立，不涉及跨产品数据流，边界清晰。', timestamp: '09:10:20', type: 'success' },
      { id: '5', agentId: 'delta', text: '开始功能模块拆分：识别出「规则引擎」「ML评分器」「优先级队列」「路由分发器」四个核心模块。', timestamp: '09:15:00', type: 'info' },
      { id: '6', agentId: 'alpha', text: '并行启动验收标准生成，基于四个功能模块逐一制定 AC 条目。', timestamp: '09:16:10', type: 'info' }
    ]
  }
];

// --- Sub-components ---

const AgentStatusIcon = ({ status }: { status: RoomAgent['status'] }) => {
  switch (status) {
    case 'processing': return <BrainCircuit className="w-3 h-3 text-blue-400 animate-pulse" />;
    case 'idle': return <Coffee className="w-3 h-3 text-slate-500" />;
    case 'error': return <AlertTriangle className="w-3 h-3 text-red-400" />;
  }
};

const AgentAvatar = ({ agent, size = 'normal' }: { agent: RoomAgent, size?: 'small' | 'normal' | 'large' }) => {
  const isLarge = size === 'large';
  const sizeClasses = isLarge ? 'w-10 h-10' : size === 'small' ? 'w-6 h-6' : 'w-8 h-8';
  
  return (
    <div className="relative group/avatar">
      <div className={`${sizeClasses} rounded-full flex items-center justify-center text-white ${agent.avatarColor} border-2 border-[#161822] shadow-lg relative z-10 overflow-hidden`}>
        {agent.status === 'processing' && (
          <motion.div 
            className="absolute inset-0 bg-white/20"
            animate={{ y: ['100%', '-100%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        )}
        {agent.icon}
      </div>
      
      {/* Status Badge Fixed to Top Right */}
      <div className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#161822] z-20 ${
        agent.status === 'processing' ? 'bg-blue-900' : 
        agent.status === 'error' ? 'bg-red-900' : 'bg-slate-800'
      }`}>
        <AgentStatusIcon status={agent.status} />
        {agent.status === 'processing' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50"></span>
        )}
        {agent.status === 'error' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40"></span>
        )}
      </div>
    </div>
  );
};

const RoomCard = ({ room, onClick }: { room: MeetingRoom, onClick: (r: MeetingRoom) => void }) => {
  const [activeLogIndex, setActiveLogIndex] = useState(room.logs.length - 1);

  useEffect(() => {
    if (room.status !== 'processing') return;
    const interval = setInterval(() => {
      setActiveLogIndex(prev => (prev === room.logs.length - 1 ? Math.max(0, room.logs.length - 3) : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [room]);

  const activeLog = room.logs[activeLogIndex] || room.logs[room.logs.length - 1];
  const activeAgent = room.agents.find(a => a.id === activeLog?.agentId);

  const borderColor = 
    room.status === 'human_intervention' ? 'border-red-500/50 hover:border-red-400' :
    room.status === 'processing' ? 'border-blue-500/50 hover:border-blue-400' :
    'border-slate-700 hover:border-slate-500';

  const glowColor =
    room.status === 'human_intervention' ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' :
    room.status === 'processing' ? 'shadow-[0_0_15px_rgba(59,130,246,0.15)]' :
    'shadow-none';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(room)}
      className={`cursor-pointer bg-[#0e0e14] border ${borderColor} ${glowColor} rounded-2xl overflow-hidden flex flex-col h-[340px] transition-all duration-300 relative group`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04] bg-white/[0.01] flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-mono text-slate-400">{room.ticketId}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200 line-clamp-1 pr-2">{room.ticketTitle}</h3>
          </div>
          <Badge 
            status={room.status === 'human_intervention' ? 'error' : room.status === 'processing' ? 'processing' : 'success'} 
            text={
              <span className={`text-xs whitespace-nowrap ${room.status === 'human_intervention' ? 'text-red-400' : room.status === 'processing' ? 'text-blue-400' : 'text-green-400'}`}>
                [{room.stageIndex}/{room.totalStages}] {room.stageName}
              </span>
            } 
          />
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/40 px-2 py-1 rounded-md border border-slate-700/50">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span className="font-mono">{room.stageDuration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/40 px-2 py-1 rounded-md border border-slate-700/50 flex-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <div className="flex-1 flex items-center gap-2">
              <span className="font-mono">{(room.tokenConsumed / 1000).toFixed(1)}k</span>
              <Progress 
                percent={Math.min(100, (room.tokenConsumed / room.tokenBudget) * 100)} 
                showInfo={false} 
                size="small"
                strokeColor={room.tokenConsumed > room.tokenBudget * 0.9 ? '#ef4444' : '#3b82f6'}
                trailColor="rgba(255,255,255,0.1)"
                style={{ marginBottom: 0, minWidth: '40px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body: Agents & Brief */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        {/* Humanized Agents Presentation */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> 参会代表 ({room.agents.length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {room.agents.slice(0, 3).map(agent => (
              <Tooltip 
                key={agent.id} 
                title={
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-white">{agent.name} · {agent.role}</span>
                    <span className="text-xs text-slate-300">状态: {agent.currentAction}</span>
                  </div>
                }
              >
                <div className="flex flex-col items-center gap-1.5 group/ag">
                  <AgentAvatar agent={agent} />
                  <span className="text-[10px] text-slate-400 max-w-[48px] truncate text-center transition-colors group-hover/ag:text-slate-200">
                    {agent.name}
                  </span>
                </div>
              </Tooltip>
            ))}
            {room.agents.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#161822] flex items-center justify-center text-xs text-slate-400">
                +{room.agents.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Log Brief */}
        <div className="bg-black/40 rounded-xl p-3 border border-slate-800/50 h-[88px] flex flex-col justify-center relative overflow-hidden group-hover:border-slate-700 transition-colors">
          <div className="absolute top-2 left-3 text-[9px] text-slate-500 font-mono flex items-center gap-1">
            <Activity className="w-3 h-3" /> 最新发言
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLog?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-start gap-2"
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full flex shrink-0 items-center justify-center text-white opacity-80 ${activeAgent?.avatarColor || 'bg-slate-600'}`}>
                {activeAgent?.icon || <Bot className="w-2.5 h-2.5" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  <span className="text-slate-500 mr-1 font-mono">[{activeLog?.timestamp}]</span>
                  {activeLog?.text}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Action */}
      <div className={`p-3 flex items-center justify-between border-t border-white/[0.04] ${
        room.status === 'human_intervention' ? 'bg-red-950/20' : 'bg-slate-900/30'
      }`}>
        <span className={`text-xs font-medium line-clamp-1 flex-1 pr-2 ${
          room.status === 'human_intervention' ? 'text-red-400 flex items-center gap-1' : 'text-slate-400'
        }`}>
          {room.status === 'human_intervention' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          {room.brief}
        </span>
        <Button 
          type="primary" 
          size="small" 
          className={`shrink-0 flex items-center gap-1 text-[11px] h-7 px-3 border-none ${
            room.status === 'human_intervention' 
              ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)] opacity-0 group-hover:opacity-100 transition-opacity'
          }`}
        >
          介入会议 <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
};


const InterventionDialog = ({ 
  room, 
  open, 
  onClose,
  onIntervene
}: { 
  room: MeetingRoom | null; 
  open: boolean; 
  onClose: () => void;
  onIntervene: (text: string) => void;
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && room) {
      setSelectedNodeId(room.currentNode);
    }
  }, [open, room?.id]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [open, room?.logs, isTyping]);

  if (!room) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onIntervene(inputText);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1500);
  };

  // Only show nodes for the current stage
  const currentStage = SOP_STAGES.find(s => s.id === room.stageIndex);
  const stageNodes = currentStage?.nodes || [];
  const selectedNode = stageNodes.find(n => n.id === selectedNodeId) 
    || stageNodes.find(n => n.id === room.currentNode) 
    || stageNodes[0];

  const getNodeTypeInfo = (type: NodeType) => {
    switch (type) {
      case 'ai': return { label: 'AI 自动处理', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
      case 'human': return { label: '人工确认操作', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
      case 'human_start': return { label: '人工启动确认', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
      case 'ai_human': return { label: 'AI + 人工协同', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
      case 'human_multi': return { label: '多人联合审批', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
      case 'system': return { label: '系统自动执行', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' };
      case 'ai_exception': return { label: 'AI异常降级人工', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
      default: return { label: '未知', color: 'text-slate-500', bg: 'bg-slate-800/30 border-slate-700/30' };
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1560}
      centered
      className="intervention-modal"
      classNames={{
        content: 'bg-[#0a0b12] p-0 overflow-hidden border border-slate-700/50 rounded-2xl shadow-2xl',
        mask: 'backdrop-blur-sm bg-black/70'
      }}
    >
      <div className="flex h-[820px] divide-x divide-slate-800/60">
        
        {/* COL 1: Current Stage Agenda List (300px) */}
        <div className="w-[300px] bg-[#12141c] flex flex-col shrink-0">
          {/* Ticket Header */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col justify-center gap-1.5 h-[72px]">
            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />{room.ticketId}
            </div>
            <h3 className="text-sm font-semibold text-slate-200 truncate">{room.ticketTitle}</h3>
          </div>
          
          {/* Stage Banner */}
          <div className="px-4 py-3 border-b border-slate-800/40 bg-[#0e1018]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {currentStage?.name} · 会议议题清单
              </span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1 ml-4">
              共 {stageNodes.length} 个议题节点 · 点击查看产物
            </p>
          </div>

          {/* Agenda Items - only current stage nodes */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {stageNodes.map((node, idx) => {
              const state = getNodeStateGlobal(room, node.id);
              const typeInfo = getNodeTypeInfo(node.type);
              const isSelected = selectedNode?.id === node.id;
              const isCurrentNode = node.id === room.currentNode;

              return (
                <motion.div
                  key={node.id}
                  whileHover={{ x: 2 }}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-700/60 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                      : state === 'error' ? 'bg-red-950/20 border-red-900/40 hover:border-red-700/50'
                      : state === 'human_intervention' ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/50'
                      : state === 'completed' ? 'bg-emerald-950/10 border-emerald-900/30 hover:border-emerald-700/40'
                      : state === 'processing' ? 'bg-blue-950/15 border-blue-900/30 hover:border-blue-700/50'
                      : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  {/* Node Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600">#{String(idx + 1).padStart(2, '0')}</span>
                      <div className="flex items-center gap-1.5">
                        {state === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {state === 'processing' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                        {state === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                        {state === 'human_intervention' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                        {state === 'pending' && <CircleDashed className="w-3.5 h-3.5 text-slate-600" />}
                        <span className={`text-xs font-medium ${
                          isSelected ? 'text-blue-300' :
                          state === 'error' ? 'text-red-400' :
                          state === 'human_intervention' ? 'text-amber-400' :
                          state === 'processing' ? 'text-blue-300' :
                          state === 'completed' ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          {node.name}
                        </span>
                      </div>
                    </div>
                    {isCurrentNode && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-400 whitespace-nowrap shrink-0">当前</span>
                    )}
                  </div>

                  {/* 主要动作 */}
                  <div className={`inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-md border ${typeInfo.bg}`}>
                    <Zap className={`w-2.5 h-2.5 ${typeInfo.color}`} />
                    <span className={`text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                  </div>

                  {/* 会议目标 */}
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                    {node.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* COL 2: Node Detail View — directly from OrderManagement Drawer */}
        <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
          {selectedNode ? (
            <>
              {/* Node Header */}
              <div className="h-[72px] border-b border-slate-800/60 px-6 flex items-center justify-between bg-[#0a0b12] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedNode.type.includes('ai') ? 'bg-blue-500/20 text-blue-400' :
                    selectedNode.type === 'system' ? 'bg-slate-500/20 text-slate-400' :
                    'bg-amber-500/20 text-amber-500'
                  }`}>
                    {selectedNode.type.includes('ai') ? <Bot className="w-5 h-5" /> :
                     selectedNode.type === 'system' ? <TerminalSquare className="w-5 h-5" /> :
                     <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-slate-200 flex items-center gap-2.5">
                      {selectedNode.name}
                      {selectedNode.id === room.currentNode ? (
                        <Badge
                          status={room.status === 'human_intervention' ? 'error' : 'processing'}
                          text={
                            <span className={`text-xs ${room.status === 'human_intervention' ? 'text-red-400' : 'text-blue-400'}`}>
                              {room.status === 'human_intervention' ? '等待人工干预' : '智能体处理中'}
                            </span>
                          }
                        />
                      ) : (() => {
                        const st = getNodeStateGlobal(room, selectedNode.id);
                        return st === 'completed'
                          ? <Badge status="success" text={<span className="text-xs text-green-400">已完成</span>} />
                          : st === 'pending'
                          ? <Badge status="default" text={<span className="text-xs text-slate-500">待执行</span>} />
                          : null;
                      })()}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{selectedNode.desc}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${getNodeTypeInfo(selectedNode.type).bg} ${getNodeTypeInfo(selectedNode.type).color}`}>
                  <Zap className="w-3 h-3" />
                  {getNodeTypeInfo(selectedNode.type).label}
                </div>
              </div>

              {/* Body: stage-specific panel component */}
              <div className="flex-1 overflow-hidden">
                {room.stageIndex === 1 ? (
                  <RequirementAnalysisPanel
                    nodeDesc={selectedNode.desc}
                    nodeTypeLabel={getNodeTypeInfo(selectedNode.type).label}
                    nodeTypeColor={getNodeTypeInfo(selectedNode.type).color}
                    stageName={currentStage?.name ?? ''}
                    nodeOutput={renderNodeOutput(selectedNode, room)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                    <CircleDashed className="w-10 h-10 opacity-20" />
                    <p className="text-sm">该阶段的中栏面板正在建设中</p>
                    <p className="text-xs text-slate-700">stageIndex: {room.stageIndex}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <CircleDashed className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">请从左侧选择议题节点</p>
            </div>
          )}
        </div>

        {/* COL 3: Multi-Agent Chat / Interventions (420px) */}
        <div className="w-[420px] flex flex-col h-full bg-[#0a0b12] shrink-0">
          {/* Main Header / Members Top Bar */}
          <div className="p-3 border-b border-slate-800 bg-[#161822] shrink-0 h-[72px] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
               <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-blue-400" />
                 协作会议流
               </span>
               <Tag color={room.status === 'human_intervention' ? 'error' : 'processing'} className="m-0 border-0 text-[10px]">
                 {room.status === 'human_intervention' ? '请求专家介入' : 'AI 处理中'}
               </Tag>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
               <span>在线成员:</span>
               <div className="flex items-center gap-2">
                 <Avatar size="small" className="bg-slate-700 text-[10px] ring-2 ring-[#161822]">我</Avatar>
                 <span className="mx-1 text-slate-700">|</span>
                 {room.agents.map(a => (
                   <Tooltip key={a.id} title={`${a.name} - ${a.status}`}>
                     <div className="relative">
                       <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ${a.avatarColor} ring-2 ring-[#161822]`}>
                         {a.icon}
                       </div>
                       <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#161822] ${a.status === 'error' ? 'bg-red-500' : a.status === 'processing' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                     </div>
                   </Tooltip>
                 ))}
               </div>
            </div>
          </div>

          {/* Chat Logs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar scroll-smooth">
            {room.logs.map((log, index) => {
              const isUser = log.type === 'user';
              const agent = room.agents.find(a => a.id === log.agentId);
              return (
                <motion.div 
                  key={log.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && agent && (
                    <div className="shrink-0 mt-0.5">
                      <AgentAvatar agent={agent} size="small" />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-medium text-slate-300">
                        {isUser ? '我 (人类专家)' : agent?.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">{log.timestamp}</span>
                    </div>
                    <div className={`px-3 py-2.5 rounded-xl text-[13px] leading-relaxed shadow-sm
                      ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 
                        log.type === 'error' ? 'bg-red-950/40 border border-red-900/50 text-red-200 rounded-tl-sm' :
                        log.type === 'warning' ? 'bg-amber-950/40 border border-amber-900/50 text-amber-200 rounded-tl-sm' :
                        log.type === 'success' ? 'bg-green-950/40 border border-green-900/50 text-green-200 rounded-tl-sm' :
                        'bg-[#1e2133] border border-slate-700/50 text-slate-200 rounded-tl-sm'
                      }`}>
                      {log.type === 'error' && <ShieldAlert className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-red-400" />}
                      {log.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-amber-400" />}
                      {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-green-400" />}
                      {log.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            <AnimatePresence>
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-2.5 flex-row items-center"
                >
                  <div className="shrink-0">
                    <AgentAvatar agent={room.agents[0]} size="small" />
                  </div>
                  <div className="bg-[#1e2133] border border-slate-700/50 rounded-xl rounded-tl-sm px-3 py-2.5 text-slate-400 text-xs flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                    <span>{room.agents[0].name} 正在思考...</span>
                    <span className="flex gap-1 ml-1">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={logsEndRef} className="h-2" />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#161822] border-t border-slate-800 shrink-0">
            <div className="flex items-end gap-2.5 bg-[#0a0b12] border border-slate-700 p-2 rounded-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <Input.TextArea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={room.status === 'human_intervention' ? "下发指令唤醒智能体..." : "@Alpha 下发新指令..."}
                autoSize={{ minRows: 1, maxRows: 3 }}
                className="bg-transparent border-none text-slate-200 placeholder-slate-500 shadow-none focus:ring-0 custom-scrollbar resize-none text-[13px]"
                style={{ boxShadow: 'none' }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                type="primary" 
                icon={<Send className="w-3.5 h-3.5" />} 
                onClick={handleSend}
                className="bg-blue-600 hover:bg-blue-500 h-8 w-9 px-0 flex items-center justify-center shrink-0 rounded-lg border-none shadow-[0_4px_12px_rgba(37,99,235,0.3)] mb-0.5"
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <div className="flex items-center gap-3">
                <button className="hover:text-blue-400 transition-colors flex items-center gap-1"><Zap className="w-3 h-3" /> 一键通过</button>
              </div>
              <span>Enter 发送</span>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export const MeetingRoomBoard = () => {
  const antDark = useAntThemeDark();
  const [rooms, setRooms] = useState<MeetingRoom[]>(INITIAL_ROOMS);
  const [activeRoom, setActiveRoom] = useState<MeetingRoom | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenRoom = (room: MeetingRoom) => {
    setActiveRoom(room);
    setDialogOpen(true);
  };

  const handleIntervene = (text: string) => {
    if (!activeRoom) return;

    const newLog: LogEntry = {
      id: Date.now().toString(),
      agentId: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      type: 'user'
    };

    // Update Alpha agent to processing state
    const updatedAgents = activeRoom.agents.map(a => 
      a.id === 'alpha' ? { ...a, status: 'processing' as const, currentAction: '解析人类指令...' } : a
    );

    const updatedRoom = {
      ...activeRoom,
      logs: [...activeRoom.logs, newLog],
      status: 'processing' as const, // Automatically transitions the entire modal UI back to processing!
      agents: updatedAgents,
      brief: '人类专家已介入并下发指令，正在重新评估状态...'
    };

    setActiveRoom(updatedRoom);
    setRooms(rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r));

    // Simulate Agent response after 1.5s
    setTimeout(() => {
      const responseLog: LogEntry = {
        id: (Date.now() + 1).toString(),
        agentId: updatedAgents[0].id,
        text: '收到指令，已确认排查策略，正在尝试恢复沙箱环境流转...',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'info'
      };
      
      const finalAgents = updatedAgents.map(a => 
        a.id === 'alpha' ? { ...a, status: 'processing' as const, currentAction: '执行恢复脚本中...' } :
        a.status === 'error' ? { ...a, status: 'idle' as const, currentAction: '等待上游结果' } : a
      );

      const respondedRoom = {
        ...updatedRoom,
        agents: finalAgents,
        logs: [...updatedRoom.logs, responseLog],
        brief: '正在执行恢复脚本，沙箱环境启动中...'
      };
      
      setActiveRoom(respondedRoom);
      setRooms(rooms => rooms.map(r => r.id === respondedRoom.id ? respondedRoom : r));
    }, 1500);
  };

  return (
    <ConfigProvider theme={{ algorithm: antDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <div className="flex flex-col h-full w-full bg-[#050505] text-slate-200 overflow-hidden font-sans">
        
        {/* Header */}
        <div className="h-16 px-8 flex items-center justify-between border-b border-slate-800/60 bg-[#0a0b12]/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100 tracking-wide">多智能体研发会议室</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">实时监控、干预多个工单阶段的 AI 协作过程</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-red-950/30 px-3 py-1.5 rounded-full border border-red-900/50">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-xs text-red-200 font-medium">2 会议待介入</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-900/50">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <span className="text-xs text-blue-200 font-medium">1 会议进行中</span>
            </div>
          </div>
        </div>

        {/* Board Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505]/0 to-[#050505]/0 pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto relative z-10">
            <AnimatePresence>
              {rooms.map(room => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  onClick={handleOpenRoom} 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Intervention Dialog */}
        <InterventionDialog 
          room={activeRoom}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onIntervene={handleIntervene}
        />
        
      </div>
    </ConfigProvider>
  );
};