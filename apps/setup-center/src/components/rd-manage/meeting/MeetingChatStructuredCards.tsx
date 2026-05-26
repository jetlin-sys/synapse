import React from 'react';
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  FolderGit2,
  Server,
  Users,
  XCircle,
} from 'lucide-react';
import { ReviewMarkdown } from './ReviewMarkdown';
import type { ChatDisplayKind, MeetingChatLog } from './meetingChatUtils';

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rd-chat-card__title">
      <span className="rd-chat-card__title-icon">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function NodeContextCard({ payload }: { payload: Record<string, unknown> }) {
  const order = (payload.order || {}) as Record<string, unknown>;
  const product = (payload.product || {}) as Record<string, unknown>;
  const system = (payload.system || {}) as Record<string, unknown>;
  const repos = Array.isArray(product.repos) ? product.repos : [];
  const docs = Array.isArray(product.docs) ? product.docs : [];

  return (
    <div className="rd-chat-card rd-chat-card--context">
      <SectionTitle icon={<FileText className="w-4 h-4" />}>节点基础信息</SectionTitle>
      <div className="rd-chat-card__section">
        <div className="rd-chat-card__label">工单</div>
        <div className="rd-chat-card__mono">{String(order.id || '—')}</div>
        <div className="rd-chat-card__emph">{String(order.title || '—')}</div>
        {order.prod ? (
          <div className="rd-chat-card__tag">产品：{String(order.prod)}</div>
        ) : null}
        {order.description ? (
          <p className="rd-chat-card__desc">
            {String(order.description).length > 360
              ? `${String(order.description).slice(0, 360)}…`
              : String(order.description)}
          </p>
        ) : null}
      </div>
      <div className="rd-chat-card__section">
        <div className="rd-chat-card__label">产品定位</div>
        <div className="rd-chat-card__emph">{String(product.prod || product.locator_message || '—')}</div>
        <div className="rd-chat-card__meta-row">
          <span>版本 {String(product.version || '—')}</span>
          <span>模块 {String(product.module || '—')}</span>
        </div>
        <div className="rd-chat-card__meta-row">
          <span>
            <FolderGit2 className="w-3 h-3 inline mr-1" />
            代码库 {repos.length}
          </span>
          <span>
            <Database className="w-3 h-3 inline mr-1" />
            文档 {docs.length}
          </span>
        </div>
      </div>
      {Object.keys(system).length > 0 ? (
        <div className="rd-chat-card__section">
          <div className="rd-chat-card__label">系统路径</div>
          <dl className="rd-chat-card__kv">
            {Object.entries(system)
              .slice(0, 6)
              .map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd className="truncate" title={String(v)}>
                    {String(v)}
                  </dd>
                </React.Fragment>
              ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

export function ParticipantsCard({ payload }: { payload: Record<string, unknown> }) {
  const workers = (payload.worker_profile_ids as string[]) || [];
  const participants = (payload.participants as { profile_id?: string; display_name?: string; role?: string }[]) || [];

  return (
    <div className="rd-chat-card rd-chat-card--roster">
      <SectionTitle icon={<Users className="w-4 h-4" />}>参会智能体</SectionTitle>
      <div className="rd-chat-card__meta-row">
        <span className="font-mono text-[11px]">room: {String(payload.room_id || '—')}</span>
        <span className="font-mono text-[11px]">node: {String(payload.node_id || '—')}</span>
      </div>
      <div className="rd-chat-card__chips">
        <span className="rd-chat-chip rd-chat-chip--host">
          <Bot className="w-3 h-3" />
          主持 · {String(payload.host_profile_id || 'default')}
        </span>
        {(participants.length ? participants : workers.map((id) => ({ profile_id: id, display_name: id }))).map(
          (p) => {
            const pid = String(p.profile_id || '');
            if (!pid || pid === String(payload.host_profile_id || 'default')) return null;
            return (
              <span key={pid} className="rd-chat-chip">
                {String(p.display_name || pid)}
                <span className="opacity-60 font-mono text-[10px]">{pid}</span>
              </span>
            );
          },
        )}
      </div>
    </div>
  );
}

export function WorkPlanCard({ text }: { text: string }) {
  return (
    <div className="rd-chat-card rd-chat-card--plan">
      <SectionTitle icon={<ClipboardList className="w-4 h-4" />}>工作安排计划</SectionTitle>
      <ReviewMarkdown content={text} compact className="rd-meeting-chat-markdown" />
    </div>
  );
}

export function DelegationStartCard({
  text,
  payload,
}: {
  text: string;
  payload?: Record<string, unknown>;
}) {
  const headline = String(payload?.headline || text.split('\n')[0] || '');
  const task = String(payload?.task_preview || '');
  const plan = String(payload?.plan_item_id || '');
  const reason = String(payload?.reason || '');
  const taskLine = text.split('\n').find((l) => l.startsWith('任务：'));

  return (
    <div className="rd-chat-card rd-chat-card--delegation-start">
      <SectionTitle icon={<Bot className="w-4 h-4" />}>工作委派</SectionTitle>
      <p className="rd-chat-card__emph">{headline}</p>
      {plan ? <div className="rd-chat-card__tag">计划项 {plan}</div> : null}
      {reason ? <p className="rd-chat-card__desc">原因：{reason}</p> : null}
      <pre className="rd-chat-card__preview">{task || taskLine?.replace(/^任务：\s*/, '') || text}</pre>
    </div>
  );
}

export function DelegationDoneCard({
  text,
  payload,
}: {
  text: string;
  payload?: Record<string, unknown>;
}) {
  const ok = payload?.ok !== false;
  const headline = String(payload?.headline || text.split('\n')[0] || '');
  const summary = String(payload?.result_summary || '');
  const elapsed = payload?.elapsed_s != null ? `${payload.elapsed_s}s` : '';

  return (
    <div className={`rd-chat-card rd-chat-card--delegation-done ${ok ? 'is-ok' : 'is-fail'}`}>
      <SectionTitle
        icon={ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
      >
        协作完成 {elapsed ? `· ${elapsed}` : ''}
      </SectionTitle>
      <p className="rd-chat-card__emph">{headline}</p>
      {summary ? <pre className="rd-chat-card__preview">{summary.slice(0, 1200)}</pre> : null}
    </div>
  );
}

export function HumanReportCard({ payload, text }: { payload: Record<string, unknown>; text: string }) {
  const preview = String(payload.report_preview || text || '');
  const success = payload.success !== false;

  return (
    <div className="rd-chat-card rd-chat-card--report">
      <SectionTitle icon={<Server className="w-4 h-4" />}>人工确认 / 交付摘要</SectionTitle>
      <div className={`rd-chat-card__status ${success ? 'is-ok' : 'is-warn'}`}>
        {success ? '等待人工确认' : '需关注'}
      </div>
      <p className="rd-chat-card__desc">{preview}</p>
      {payload.tokens_used_hint != null ? (
        <p className="rd-chat-card__hint">
          tokens 提示值 {String(payload.tokens_used_hint)}（{String(payload.tokens_note || '仅供参考')}）
        </p>
      ) : null}
    </div>
  );
}

export function HitlToolCard({ text }: { text: string }) {
  return (
    <div className="rd-chat-card rd-chat-card--hitl">
      <SectionTitle icon={<ClipboardList className="w-4 h-4" />}>问卷提交</SectionTitle>
      <p className="rd-chat-card__desc">{text}</p>
    </div>
  );
}

export function PendingConfirmCard({ payload, text }: { payload: Record<string, unknown>; text: string }) {
  return (
    <div className="rd-chat-card rd-chat-card--pending">
      <SectionTitle icon={<Server className="w-4 h-4" />}>节点待确认</SectionTitle>
      <p className="rd-chat-card__desc">{text}</p>
      <dl className="rd-chat-card__kv">
        {payload.duration_seconds != null ? (
          <>
            <dt>耗时</dt>
            <dd>{String(payload.duration_seconds)}s</dd>
          </>
        ) : null}
        {payload.dynamic_form != null ? (
          <>
            <dt>动态问卷</dt>
            <dd>{payload.dynamic_form ? '是' : '否'}</dd>
          </>
        ) : null}
        {payload.source ? (
          <>
            <dt>来源</dt>
            <dd>{String(payload.source)}</dd>
          </>
        ) : null}
        {payload.tokens_used_hint != null ? (
          <>
            <dt>tokens</dt>
            <dd>
              {String(payload.tokens_used_hint)}
              <span className="rd-chat-card__hint-inline">（占位估计）</span>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

export function FlowMetaCard({ payload, title }: { payload: Record<string, unknown>; title: string }) {
  const keys = Object.keys(payload).filter((k) => !['message'].includes(k)).slice(0, 8);
  return (
    <div className="rd-chat-card rd-chat-card--meta">
      <SectionTitle icon={<Server className="w-4 h-4" />}>{title}</SectionTitle>
      <dl className="rd-chat-card__kv">
        {keys.map((k) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd className="truncate" title={String(payload[k])}>
              {typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : String(payload[k])}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

export function StructuredChatBody({ log }: { log: MeetingChatLog }) {
  const kind = log.displayKind;
  const payload = log.payload || {};

  switch (kind as ChatDisplayKind) {
    case 'node_context':
      return <NodeContextCard payload={payload} />;
    case 'participants':
      return <ParticipantsCard payload={payload} />;
    case 'work_plan':
      return <WorkPlanCard text={log.text} />;
    case 'delegation_start':
      return <DelegationStartCard text={log.text} payload={payload} />;
    case 'delegation_done':
      return <DelegationDoneCard text={log.text} payload={payload} />;
    case 'human_report':
      return <HumanReportCard payload={payload} text={log.text} />;
    case 'hitl_tool':
      return <HitlToolCard text={log.text} />;
    case 'pending_confirm':
      return <PendingConfirmCard payload={payload} text={log.text} />;
    case 'flow_meta':
      return <FlowMetaCard payload={payload} title={log.text || '流程元数据'} />;
    default:
      return null;
  }
}
