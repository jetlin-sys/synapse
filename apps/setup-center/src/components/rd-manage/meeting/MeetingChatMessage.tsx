import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  MessageSquare,
  ShieldAlert,
  User,
  Zap,
} from 'lucide-react';
import { ReviewMarkdown } from './ReviewMarkdown';
import { MeetingAgentAvatar } from './MeetingAgentAvatar';
import { StructuredChatBody } from './MeetingChatStructuredCards';
import {
  classifyMeetingChat,
  isStructuredDisplayKind,
  parseDelegationMessage,
  splitPipelineMessage,
  type MeetingChatLog,
} from './meetingChatUtils';
import type { RoomAgent } from './meetingChatTypes';

export type { MeetingChatLog };

function StatusIcon({ type }: { type: MeetingChatLog['type'] }) {
  if (type === 'error') return <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (type === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (type === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  return null;
}

function PlainTextBlock({ text, mono }: { text: string; mono?: boolean }) {
  return (
    <div className={mono ? 'rd-meeting-chat-mono' : 'rd-meeting-chat-plain'}>
      {text}
    </div>
  );
}

function PipelineCard({ text }: { text: string }) {
  const { title, body } = splitPipelineMessage(text);
  return (
    <div className="rd-meeting-chat-pipeline">
      <div className="rd-meeting-chat-pipeline__icon">
        <Zap className="w-4 h-4" />
      </div>
      <div className="rd-meeting-chat-pipeline__body">
        <div className="rd-meeting-chat-pipeline__title">{title}</div>
        {body ? <p className="rd-meeting-chat-pipeline__desc">{body}</p> : null}
      </div>
    </div>
  );
}

function DelegationCard({ text }: { text: string }) {
  const { headline, plan, reason, preview } = parseDelegationMessage(text);
  return (
    <div className="rd-meeting-chat-delegation">
      <div className="rd-meeting-chat-delegation__head">{headline}</div>
      {(plan || reason) && (
        <dl className="rd-meeting-chat-delegation__meta">
          {plan ? (
            <>
              <dt>计划项</dt>
              <dd>{plan}</dd>
            </>
          ) : null}
          {reason ? (
            <>
              <dt>原因</dt>
              <dd>{reason}</dd>
            </>
          ) : null}
        </dl>
      )}
      {preview ? (
        <pre className="rd-meeting-chat-delegation__preview">{preview}</pre>
      ) : null}
    </div>
  );
}

export function MeetingChatMessage({
  log,
  speakerName,
  agent,
  showAvatar,
  onAvatarClick,
}: {
  log: MeetingChatLog;
  speakerName: string;
  agent?: RoomAgent;
  showAvatar: boolean;
  onAvatarClick?: () => void;
}) {
  const kind = useMemo(() => classifyMeetingChat(log), [log]);
  const isUser = kind === 'user';
  const isStructured = kind === 'structured' || isStructuredDisplayKind(log.displayKind);
  const isLegacySystemPill = kind === 'system' && !isStructured && log.speakerRole !== 'system';

  if (isLegacySystemPill) {
    return (
      <div className="rd-meeting-chat-row rd-meeting-chat-row--system">
        <div className="rd-meeting-chat-system-pill">
          <GitBranch className="w-3 h-3 opacity-70" />
          <span>{log.text}</span>
        </div>
      </div>
    );
  }

  const rowClass = [
    'rd-meeting-chat-row',
    isUser ? 'rd-meeting-chat-row--user' : 'rd-meeting-chat-row--agent',
    log.speakerRole === 'system' ? 'rd-meeting-chat-row--system-agent' : '',
    isStructured ? 'rd-meeting-chat-row--structured' : '',
    kind === 'pipeline' ? 'rd-meeting-chat-row--pipeline' : '',
    kind === 'rich' ? 'rd-meeting-chat-row--rich' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const bubbleClass = [
    'rd-meeting-chat-bubble',
    isUser ? 'rd-meeting-chat-bubble--user' : '',
    kind === 'status' ? `rd-meeting-chat-bubble--${log.type}` : '',
    kind === 'pipeline' ? 'rd-meeting-chat-bubble--pipeline' : '',
    kind === 'delegation' ? 'rd-meeting-chat-bubble--delegation' : '',
    kind === 'rich' ? 'rd-meeting-chat-bubble--rich' : '',
    isStructured ? 'rd-meeting-chat-bubble--structured' : '',
    kind === 'agent' ? 'rd-meeting-chat-bubble--agent' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let body: React.ReactNode;
  if (isStructured) {
    body = <StructuredChatBody log={log} />;
  } else if (kind === 'pipeline') {
    body = <PipelineCard text={log.text} />;
  } else if (kind === 'delegation') {
    body = <DelegationCard text={log.text} />;
  } else if (kind === 'rich') {
    body = (
      <div className="rd-meeting-chat-rich">
        <ReviewMarkdown content={log.text} compact className="rd-meeting-chat-markdown" />
      </div>
    );
  } else if (kind === 'status') {
    body = (
      <div className="rd-meeting-chat-status-inner">
        <StatusIcon type={log.type} />
        <PlainTextBlock text={log.text} />
      </div>
    );
  } else {
    body = <PlainTextBlock text={log.text} mono={log.rich} />;
  }

  const AvatarSlot = () => {
    if (isUser) {
      return (
        <div
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white border-2 border-background shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          aria-hidden
        >
          <User className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (!showAvatar || !agent) {
      return <div className="w-7 h-7 shrink-0" aria-hidden />;
    }
    return (
      <MeetingAgentAvatar
        agent={agent}
        size="small"
        showStatusBadge={false}
        onClick={onAvatarClick}
      />
    );
  };

  return (
    <div className={rowClass}>
      {!isUser && <AvatarSlot />}
      <div className="rd-meeting-chat-col">
        <div className="rd-meeting-chat-meta">
          <span className="rd-meeting-chat-speaker">{speakerName}</span>
          <span className="rd-meeting-chat-time">{log.timestamp}</span>
        </div>
        <div className={bubbleClass}>{body}</div>
      </div>
      {isUser && <AvatarSlot />}
    </div>
  );
}

export function MeetingChatEmpty() {
  return (
    <div className="rd-meeting-chat-empty">
      <MessageSquare className="w-8 h-8 opacity-25" />
      <p>协作会议流为只读展示：流程步骤、委派记录与智能体发言将自动更新</p>
    </div>
  );
}
