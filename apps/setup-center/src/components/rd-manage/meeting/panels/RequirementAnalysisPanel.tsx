/**
 * RequirementAnalysisPanel
 * 需求分析阶段 (stageIndex === 1) 的中栏面板 — 真实产出 / 消耗 / 流程
 */
import React from 'react';
import { Info } from 'lucide-react';
import {
  MeetingNodeDetailPanel,
  type MeetingNodeVisualState,
} from './MeetingNodeDetailPanel';

export interface RequirementAnalysisPanelProps {
  synapseApiBase: string;
  roomId: string;
  scopeType?: 'demand' | 'task';
  scopeId?: string;
  nodeId: string;
  nodeName: string;
  nodeDesc: string;
  nodeTypeLabel: string;
  nodeTypeColor: string;
  stageName: string;
  nodeState: MeetingNodeVisualState;
  pollMs?: number;
}

export function RequirementAnalysisPanel({
  synapseApiBase,
  roomId,
  scopeType,
  scopeId,
  nodeId,
  nodeName,
  nodeDesc,
  nodeTypeLabel,
  nodeTypeColor,
  stageName,
  nodeState,
  pollMs = 4000,
}: RequirementAnalysisPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/40 bg-[color:var(--panel)]/40 px-5 py-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 shadow-inner">
          <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Info className="h-3 w-3" /> 节点说明 / 会议目标
          </h5>
          <p className="text-sm leading-relaxed text-foreground/90">{nodeDesc}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/50 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80">主要动作：</span>
              <span className={nodeTypeColor}>{nodeTypeLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80">所属阶段：</span>
              <span className="text-muted-foreground">{stageName}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-5">
        <MeetingNodeDetailPanel
          synapseApiBase={synapseApiBase}
          roomId={roomId}
          scopeType={scopeType}
          scopeId={scopeId}
          nodeId={nodeId}
          nodeName={nodeName}
          nodeDesc={nodeDesc}
          nodeState={nodeState}
          pollMs={nodeState === 'processing' ? pollMs : 0}
        />
      </div>
    </div>
  );
}
