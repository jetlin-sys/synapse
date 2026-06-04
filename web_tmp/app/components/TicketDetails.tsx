import React, { useState } from 'react';
import { Table, Tag, Button, Space, Avatar, Typography, Progress } from 'antd';
import type { TableColumnsType } from 'antd';
import { Ticket, ExternalLink, AlertCircle, GitMerge, ChevronDown, ChevronUp, FileCode2, BarChart2, Layers, Package, Clock } from 'lucide-react';

const { Text, Link } = Typography;

interface TicketRecord {
  key: string;
  id: string;
  title: string;
  description: string;   // 需求描述
  matchRate: number;
  type: 'bug' | 'feature';
  assignee: string;
  product: string;
  modules: string[];
  effort: string;
  devTickets: number;    // 研发单个数
  complexity: 'low' | 'medium' | 'high';
}

const relatedTickets: TicketRecord[] = [
  {
    key: '1',
    id: 'ISSUE-2024',
    title: '购物车计算折扣时偶发的精度丢失问题',
    description:
      '用户在结算时，购物车内含有折扣商品（如 9折、满减）时，前端展示金额与后端计算金额出现 ±0.01 元的尾差。经排查，根因为 JavaScript 浮点数精度问题，折扣率与单价相乘时未做精度截断处理。需在结算模块统一使用整数分（×100）或引入 Decimal.js 进行精确计算，并在单元测试中覆盖边界场景。',
    matchRate: 94,
    type: 'bug',
    assignee: '李明',
    product: '电商平台',
    modules: ['购物车', '结算'],
    effort: '3人天',
    devTickets: 4,
    complexity: 'high',
  },
  {
    key: '2',
    id: 'ISSUE-1988',
    title: '订单金额统计报表尾差修复',
    description:
      '财务报表在汇总当日订单总金额时，与订单明细加总结果存在最高 ¥0.5 的差异。原因为数据库聚合查询使用 FLOAT 类型字段，累计误差在大数据量下被放大。需将 order_amount 字段类型由 FLOAT 改为 DECIMAL(12,2)，并对历史数据进行回刷校正。',
    matchRate: 81,
    type: 'bug',
    assignee: '张三',
    product: '数据报表',
    modules: ['订单', '报表'],
    effort: '2人天',
    devTickets: 2,
    complexity: 'medium',
  },
  {
    key: '3',
    id: 'FEAT-3012',
    title: '支持使用大数对象处理所有的资金计算逻辑',
    description:
      '当前系统在涉及资金计算的多个模块（支付、账单、风控）中混用 number 与 string 类型，存在潜在精度风险。本需求要求引入统一的 BigDecimal 工具类，封装加减乘除与格式化方法，替换全量资金计算逻辑，并编写迁移文档，确保各模块平滑过渡，回归测试通过率 100%。',
    matchRate: 67,
    type: 'feature',
    assignee: '王五',
    product: '基础平台',
    modules: ['支付', '账单', '风控'],
    effort: '8人天',
    devTickets: 7,
    complexity: 'high',
  },
  {
    key: '4',
    id: 'ISSUE-2102',
    title: 'Redis 分布式锁在高并发续约场景下的偶发失效',
    description:
      '在双十一压测期间，发现部分秒杀订单出现了超卖现象。经日志分析，当 Redis 负载极高导致网络抖动时，Redisson 的看门狗续约机制可能因为超时而未能及时续约，导致锁提前释放。需优化续约重试策略，并增加本地二级锁作为兜底保障。',
    matchRate: 89,
    type: 'bug',
    assignee: '赵六',
    product: '中间件',
    modules: ['缓存', '分布式锁'],
    effort: '4人天',
    devTickets: 3,
    complexity: 'high',
  },
  {
    key: '5',
    id: 'FEAT-3045',
    title: '自动化对账引擎性能优化与索引重建',
    description:
      '随着日订单量突破千万级，当前的对账任务耗时从 2小时增加到了 6小时，影响了次日的报表生成。本方案计划将单线程对账升级为基于分片的并行对账模式，并对核心流水表进行分区处理及覆盖索引优化，目标将耗时降低至 1.5小时以内。',
    matchRate: 78,
    type: 'feature',
    assignee: '陈七',
    product: '支付结算',
    modules: ['对账', '性能'],
    effort: '5人天',
    devTickets: 5,
    complexity: 'medium',
  },
];

// ── 颜色工具函数 ───────────────────────────────────────
function getMatchColor(rate: number): string {
  if (rate >= 90) return '#34d399';
  if (rate >= 70) return '#60a5fa';
  return '#fb923c';
}
function getMatchBg(rate: number): string {
  if (rate >= 90) return 'rgba(52, 211, 153, 0.12)';
  if (rate >= 70) return 'rgba(96, 165, 250, 0.12)';
  return 'rgba(251, 146, 60, 0.12)';
}
function getMatchBorder(rate: number): string {
  if (rate >= 90) return 'rgba(52, 211, 153, 0.35)';
  if (rate >= 70) return 'rgba(96, 165, 250, 0.35)';
  return 'rgba(251, 146, 60, 0.35)';
}

const complexityConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low: { label: '低', color: '#86efac', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  medium: { label: '中', color: '#fde68a', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)' },
  high: { label: '高', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
};

const sortedTickets = [...relatedTickets].sort((a, b) => b.matchRate - a.matchRate);

// ── 展开行内容 ────────────────────────────────────────
function ExpandedDescription({ description }: { description: string }) {
  return (
    <div
      style={{
        margin: '0 0 2px 0',
        padding: '10px 16px 10px 44px',
        background: 'rgba(99, 102, 241, 0.05)',
        borderTop: '1px solid rgba(99, 102, 241, 0.15)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ marginTop: 1, flexShrink: 0 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: 'rgba(99, 102, 241, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCode2 size={11} color="#a5b4fc" />
          </div>
        </div>
        <div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
            需求描述
          </Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
            {description}
          </Text>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────
export function TicketDetails() {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const columns: TableColumnsType<TicketRecord> = [
    // 1. 单号
    {
      title: '单号',
      dataIndex: 'id',
      key: 'id',
      width: 126,
      render: (id, record) => (
        <Space size={5} align="center">
          {record.type === 'bug' ? (
            <AlertCircle size={12} color="#ef4444" />
          ) : (
            <GitMerge size={12} color="#3b82f6" />
          )}
          <Link
            style={{
              color: '#94a3b8',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 12,
            }}
          >
            {id}
          </Link>
        </Space>
      ),
    },
    // 2. 标题（可点击展开描述）
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title, record) => {
        const expanded = expandedKeys.includes(record.key);
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => toggleExpand(record.key)}
          >
            <Text
              style={{
                fontSize: 12,
                color: expanded ? '#c4b5fd' : '#94a3b8',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
            >
              {title}
            </Text>
            <span style={{ flexShrink: 0, color: expanded ? '#a78bfa' : '#475569', transition: 'color 0.15s' }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </div>
        );
      },
    },
    // 3. 产品
    {
      title: '产品',
      dataIndex: 'product',
      key: 'product',
      width: 88,
      render: (product: string) => (
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>{product}</Text>
      ),
    },
    // 4. 模块
    {
      title: '模块',
      dataIndex: 'modules',
      key: 'modules',
      width: 138,
      render: (modules: string[]) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {modules.map((m) => (
            <Tag
              key={m}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: 11,
                marginInlineEnd: 0,
                padding: '0 5px',
                lineHeight: '18px',
              }}
            >
              {m}
            </Tag>
          ))}
        </div>
      ),
    },
    // 5. 匹配度
    {
      title: '匹配度',
      dataIndex: 'matchRate',
      key: 'matchRate',
      width: 110,
      render: (rate: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 40,
              height: 19,
              borderRadius: 10,
              background: getMatchBg(rate),
              border: `1px solid ${getMatchBorder(rate)}`,
              padding: '0 6px',
            }}
          >
            <Text
              style={{
                color: getMatchColor(rate),
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
              }}
            >
              {rate}%
            </Text>
          </div>
          <Progress
            percent={rate}
            showInfo={false}
            size={[44, 3]}
            strokeColor={getMatchColor(rate)}
            railColor="rgba(51,65,85,0.4)"
            style={{ marginBottom: 0 }}
          />
        </div>
      ),
    },
    // 6. 工作量
    {
      title: '工作量',
      dataIndex: 'effort',
      key: 'effort',
      width: 70,
      render: (effort: string) => (
        <Text
          style={{
            color: '#cbd5e1',
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {effort}
        </Text>
      ),
    },
    // 7. 研发单
    {
      title: '研发单',
      dataIndex: 'devTickets',
      key: 'devTickets',
      width: 66,
      render: (count: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 28,
              height: 19,
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              padding: '0 7px',
            }}
          >
            <Text
              style={{
                color: '#7dd3fc',
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
              }}
            >
              {count}
            </Text>
          </div>
        </div>
      ),
    },
    // 8. 复杂度
    {
      title: '复杂度',
      dataIndex: 'complexity',
      key: 'complexity',
      width: 66,
      render: (complexity: string) => {
        const cfg = complexityConfig[complexity] ?? complexityConfig['medium'];
        return (
          <Tag
            style={{
              background: cfg.bg,
              color: cfg.color,
              border: `1px solid ${cfg.border}`,
              fontSize: 11,
              marginInlineEnd: 0,
              padding: '0 7px',
            }}
          >
            {cfg.label}
          </Tag>
        );
      },
    },
    // 9. 负责人
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 88,
      render: (assignee: string) => (
        <Space size={6} align="center">
          <Avatar
            size={20}
            style={{
              background: '#1e293b',
              fontSize: 10,
              fontWeight: 600,
              border: '1px solid rgba(51, 65, 85, 0.6)',
              color: '#94a3b8',
            }}
          >
            {assignee.charAt(0)}
          </Avatar>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{assignee}</Text>
        </Space>
      ),
    },
  ];

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 16px 0',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          flexShrink: 0,
          background: '#161822',
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 8,
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          <Space size={8} align="center">
            <Ticket size={15} color="#818cf8" />
            <Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
              历史相似工单
            </Text>
          </Space>
          <Button
            type="link"
            size="small"
            style={{
              color: '#60a5fa',
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
            icon={<ExternalLink size={11} />}
            iconPlacement="end"
          >
            查看完整看板
          </Button>
        </div>

        {/* Summary stats row */}
        {(() => {
          const total = sortedTickets.length;
          const featureCount = sortedTickets.filter((t) => t.type === 'feature').length;
          const bugCount = sortedTickets.filter((t) => t.type === 'bug').length;
          const featurePct = Math.round((featureCount / total) * 100);
          const bugPct = 100 - featurePct;

          // Most frequent module
          const moduleCount: Record<string, number> = {};
          sortedTickets.forEach((t) => t.modules.forEach((m) => { moduleCount[m] = (moduleCount[m] || 0) + 1; }));
          const topModule = Object.entries(moduleCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

          // Total effort (parse "N人天")
          const totalEffort = sortedTickets.reduce((sum, t) => {
            const n = parseFloat(t.effort);
            return sum + (isNaN(n) ? 0 : n);
          }, 0);

          const stats = [
            {
              icon: <BarChart2 size={12} color="#a78bfa" />,
              label: '相似工单',
              value: `${total} 条`,
              color: '#c4b5fd',
              bg: 'rgba(139, 92, 246, 0.08)',
              border: 'rgba(139, 92, 246, 0.2)',
            },
            {
              icon: <AlertCircle size={12} color="#f87171" />,
              label: '需求 / 故障',
              value: `${featurePct}% / ${bugPct}%`,
              color: '#fca5a5',
              bg: 'rgba(239, 68, 68, 0.07)',
              border: 'rgba(239, 68, 68, 0.18)',
            },
            {
              icon: <Layers size={12} color="#60a5fa" />,
              label: '最关联模块',
              value: topModule,
              color: '#93c5fd',
              bg: 'rgba(59, 130, 246, 0.07)',
              border: 'rgba(59, 130, 246, 0.18)',
            },
            {
              icon: <Clock size={12} color="#34d399" />,
              label: '工作量预估',
              value: `2 人天`,
              color: '#6ee7b7',
              bg: 'rgba(52, 211, 153, 0.07)',
              border: 'rgba(52, 211, 153, 0.18)',
            },
          ];

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                padding: '0 8px 10px',
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '7px 10px',
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {s.icon}
                    <Text style={{ fontSize: 10, color: '#64748b' }}>{s.label}</Text>
                  </div>
                  <Text
                    style={{
                      fontSize: 13,
                      color: s.color,
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, monospace',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {s.value}
                  </Text>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: '#161822' }}>
        <Table<TicketRecord>
          dataSource={sortedTickets}
          columns={columns}
          rowKey="key"
          pagination={{
            pageSize: 5,
            size: 'small',
            showSizeChanger: false,
            showTotal: (total) => (
              <span style={{ color: '#64748b', fontSize: 12 }}>共 {total} 条</span>
            ),
            style: {
              padding: '8px 16px',
              margin: 0,
              borderTop: '1px solid rgba(51, 65, 85, 0.4)',
              background: '#161822',
            },
          }}
          size="small"
          style={{ 
            background: 'transparent', 
            height: '100%',
            margin: 0
          }}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandedRowRender: (record) => (
              <ExpandedDescription description={record.description} />
            ),
            showExpandColumn: false,
          }}
          onRow={(record) => ({
            style: { cursor: 'default' },
          })}
        />
      </div>
    </div>
  );
}