/**
 * 方案评审面板：一次性完成评审（补丁选择 + 小鲸评分 + 产出物预览 + 拆单预览 + 人工意见）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { CheckCircle2, FileText, Loader2, Shield, XCircle } from 'lucide-react';

import {
  fetchArtifactFile,
  fetchPatchVersions,
  fetchSolutionReview,
  submitSolutionReviewDecision,
  type PatchVersionItem,
  type SolutionReviewPayload,
  type SplitTaskDraft,
  type SolutionReviewRepoRow,
} from '../../../api/meetingRoomService';
import { ReviewMarkdown } from './ReviewMarkdown';

const { TextArea } = Input;
const { Text } = Typography;

interface Props {
  synapseApiBase: string;
  roomId: string;
  scopeId?: string;
  initialPayload?: SolutionReviewPayload | null;
  blocked?: boolean;
  onDecided?: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
  info: 'default',
};

function impactTableColumns(headers: string[]): TableColumnsType<Record<string, string>> {
  return headers.map((h) => ({ title: h, dataIndex: h, key: h, ellipsis: true }));
}

function tableFromRows(rows: Record<string, string>[] | undefined, headers: string[]) {
  if (!rows?.length) return null;
  const cols = impactTableColumns(headers);
  const data = rows.map((r, i) => ({ ...r, key: String(i) }));
  return <Table size="small" columns={cols} dataSource={data} pagination={false} scroll={{ x: true }} />;
}

export function SolutionReviewPanel({
  synapseApiBase,
  roomId,
  initialPayload,
  blocked = false,
  onDecided,
}: Props) {
  const [payload, setPayload] = useState<SolutionReviewPayload | null>(initialPayload ?? null);
  const [loading, setLoading] = useState(!initialPayload);
  const [submitting, setSubmitting] = useState(false);
  const [humanComment, setHumanComment] = useState('');
  const [patchByBranch, setPatchByBranch] = useState<Record<string, string>>({});
  const [patchOptions, setPatchOptions] = useState<Record<string, PatchVersionItem[]>>({});
  const [patchLoading, setPatchLoading] = useState<Record<string, boolean>>({});
  /** 已请求过的分支（含空列表），避免空结果触发无限重试 */
  const patchFetchedRef = useRef<Set<string>>(new Set());
  const [artifactPreview, setArtifactPreview] = useState<{ path: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    if (!synapseApiBase || !roomId) return;
    setLoading(true);
    try {
      const res = await fetchSolutionReview(synapseApiBase, roomId);
      setPayload(res.payload);
      const hr = res.payload?.human_review;
      if (hr?.comment) setHumanComment(hr.comment);
      if (hr?.status === 'rejected') {
        message.warning('方案评审未通过，流程已阻断，请重新处理本节点');
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载方案评审失败');
    } finally {
      setLoading(false);
    }
  }, [synapseApiBase, roomId]);

  useEffect(() => {
    if (!initialPayload) void load();
    else setPayload(initialPayload);
  }, [initialPayload, load]);

  const repos = payload?.func_solution_parsed?.repos ?? [];
  const impact = payload?.func_solution_parsed?.impact_assessment;
  const whale = payload?.whale_review;
  const artifacts = payload?.inputs?.stage2_artifacts ?? [];
  const tasks = payload?.split_tasks_draft ?? [];
  const humanStatus = payload?.human_review?.status ?? 'pending';
  const readOnly = blocked || humanStatus !== 'pending';

  const branchIds = useMemo(
    () => [...new Set(repos.map((r) => (r.branch_version_id || '').trim()).filter(Boolean))],
    [repos],
  );
  const branchIdsKey = branchIds.join('|');

  useEffect(() => {
    const allowed = new Set(branchIds);
    for (const id of [...patchFetchedRef.current]) {
      if (!allowed.has(id)) patchFetchedRef.current.delete(id);
    }
  }, [branchIdsKey, branchIds]);

  useEffect(() => {
    if (!synapseApiBase || !roomId || readOnly || !branchIds.length) return;

    for (const bid of branchIds) {
      if (patchFetchedRef.current.has(bid)) continue;
      patchFetchedRef.current.add(bid);
      setPatchLoading((p) => ({ ...p, [bid]: true }));
      void fetchPatchVersions(synapseApiBase, roomId, [bid])
        .then((res) => {
          const list = Array.isArray(res?.patches) ? res.patches : [];
          setPatchOptions((p) => ({ ...p, [bid]: list }));
        })
        .catch((e) => {
          setPatchOptions((p) => ({ ...p, [bid]: [] }));
          const msg = e instanceof Error ? e.message : '加载补丁失败';
          message.error(`分支 ${bid}：${msg}`);
        })
        .finally(() => {
          setPatchLoading((p) => ({ ...p, [bid]: false }));
        });
    }
  }, [synapseApiBase, roomId, branchIdsKey, readOnly, branchIds]);

  const repoColumns: TableColumnsType<SolutionReviewRepoRow & { key: string }> = [
    { title: '产品分支ID', dataIndex: 'branch_version_id', width: 120 },
    { title: '应用模块', dataIndex: 'product_module_name', width: 120, ellipsis: true },
    { title: '产品分支', dataIndex: 'branch_version_name', width: 160, ellipsis: true },
    { title: '仓库地址', dataIndex: 'repo_url', ellipsis: true },
    { title: '改造内容', dataIndex: 'change_summary', ellipsis: true },
    {
      title: '补丁计划',
      key: 'patch',
      width: 220,
      render: (_, row) => {
        const bid = (row.branch_version_id || '').trim();
        if (!bid) return <Text type="secondary">—</Text>;
        const list = patchOptions[bid];
        const fetched = patchFetchedRef.current.has(bid) && !patchLoading[bid];
        const opts = (list ?? []).map((p) => ({
          value: p.patchName || '',
          label: p.patchName ? `${p.patchName}${p.state ? ` (${p.state})` : ''}` : '',
        })).filter((o) => o.value);
        const placeholder = patchLoading[bid]
          ? '加载中…'
          : fetched && opts.length === 0
            ? '暂无补丁计划'
            : '选择补丁';
        return (
          <Select
            className="w-full"
            placeholder={placeholder}
            loading={patchLoading[bid]}
            disabled={readOnly || (fetched && opts.length === 0)}
            options={opts}
            value={patchByBranch[bid] || undefined}
            onChange={(v) => setPatchByBranch((m) => ({ ...m, [bid]: v }))}
          />
        );
      },
    },
  ];

  const previewTasks: SplitTaskDraft[] = useMemo(() => {
    return tasks.map((t) => {
      const bid = (t.branch_version_id || '').trim();
      const patch = bid ? patchByBranch[bid] : '';
      return { ...t, patchName: patch || t.patchName || '' };
    });
  }, [tasks, patchByBranch]);

  const splitColumns: TableColumnsType<SplitTaskDraft & { key: string }> = [
    { title: '研发单标题', dataIndex: 'taskTitle', ellipsis: true },
    { title: '应用模块', dataIndex: 'productModuleName', width: 110 },
    { title: '产品分支', dataIndex: 'branchVersionName', width: 140, ellipsis: true },
    { title: '补丁', dataIndex: 'patchName', width: 140 },
    { title: '需求单号', dataIndex: 'taskNo', width: 100 },
  ];

  const openArtifact = async (relPath: string) => {
    if (!relPath) return;
    setPreviewLoading(true);
    try {
      const file = await fetchArtifactFile(synapseApiBase, roomId, relPath);
      setArtifactPreview({ path: relPath, content: file.content });
    } catch {
      message.error('无法读取产出物');
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = async (decision: 'approve' | 'reject') => {
    if (!humanComment.trim() && decision === 'reject') {
      message.warning('不通过时请填写人工评审意见');
      return;
    }
    if (decision === 'approve') {
      for (const bid of branchIds) {
        if (!patchByBranch[bid]?.trim()) {
          message.warning(`请为分支 ${bid} 选择补丁计划`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const patches = branchIds.map((bid) => ({
        branch_version_id: bid,
        patch_name: patchByBranch[bid] || '',
      }));
      await submitSolutionReviewDecision(synapseApiBase, roomId, {
        decision,
        comment: humanComment.trim(),
        patches: decision === 'approve' ? patches : undefined,
      });
      message.success(decision === 'approve' ? '评审通过，已落盘拆单计划并推进流程' : '评审未通过，已阻断流程');
      await load();
      onDecided?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !payload) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        加载方案评审…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert type="warning" showIcon message="未找到 solution_review.json，请先完成小鲸方案评审技能产出" />
      </div>
    );
  }

  const score = whale?.score ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        {blocked || humanStatus === 'rejected' ? (
          <Alert
            type="error"
            showIcon
            message="方案评审未通过 — 会议室已阻断"
            description="产出物已归档。请根据意见修订方案后，对本节点执行「重新处理」。"
          />
        ) : null}

        {humanStatus === 'approved' ? (
          <Alert type="success" showIcon message="方案评审已通过，拆单计划已落盘" />
        ) : null}

        {/* 小鲸评分 */}
        <Card
          size="small"
          title={
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-400" />
              小鲸评分与建议
            </span>
          }
        >
          <div className="flex flex-wrap gap-6 items-center mb-4">
            <Progress
              type="circle"
              percent={Math.min(100, Math.max(0, score))}
              size={72}
              strokeColor={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'}
            />
            <div>
              <div className="text-sm text-muted-foreground">综合评分</div>
              <div className="text-2xl font-semibold">{score}</div>
              <Tag color={whale?.verdict === 'pass' ? 'green' : 'gold'}>{whale?.verdict || '—'}</Tag>
            </div>
            {whale?.score_breakdown ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(whale.score_breakdown).map(([k, v]) => (
                  <Tag key={k}>
                    {k}: {v}
                  </Tag>
                ))}
              </div>
            ) : null}
          </div>
          {whale?.summary_markdown ? (
            <div className="mb-4 rounded-lg border border-border/50 bg-muted/10 p-3">
              <ReviewMarkdown content={whale.summary_markdown} />
            </div>
          ) : null}
          <div className="space-y-2">
            {(whale?.suggestions ?? []).map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <Tag color={SEVERITY_COLOR[s.severity || 'info'] || 'default'}>
                  {s.severity || 'info'}
                </Tag>
                <span className="ml-2 font-medium">{s.title}</span>
                <p className="mt-1 text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 涉及仓库 */}
        <Card size="small" title="涉及仓库与补丁选择">
          <Table
            size="small"
            columns={repoColumns}
            dataSource={repos.map((r, i) => ({ ...r, key: String(i) }))}
            pagination={false}
            scroll={{ x: 1100 }}
          />
        </Card>

        {/* 影响评估 */}
        <Card
          size="small"
          title={
            <span className="text-amber-400 font-medium">影响评估（重点）</span>
          }
        >
          <Collapse
            defaultActiveKey={['security', 'upgrade', 'functional']}
            items={[
              {
                key: 'security',
                label: '安全影响',
                children: tableFromRows(impact?.security, [
                  '安全维度',
                  '影响说明',
                  '影响程度',
                  '安全措施',
                  '备注',
                ]),
              },
              {
                key: 'upgrade',
                label: '升级风险',
                children: tableFromRows(impact?.upgrade_risk, [
                  '风险类型',
                  '风险描述',
                  '风险等级',
                  '规避措施',
                  '回滚预案',
                ]),
              },
              {
                key: 'functional',
                label: '功能影响',
                children: tableFromRows(impact?.functional, [
                  '影响类型',
                  '影响模块',
                  '影响说明',
                  '影响范围',
                  '备注',
                ]),
              },
              {
                key: 'performance',
                label: '性能影响',
                children: tableFromRows(impact?.performance, [
                  '变更点',
                  '性能影响类型',
                  '影响程度',
                  '无法规避原因',
                  '规避措施',
                ]),
              },
              {
                key: 'config',
                label: '配置变更',
                children: tableFromRows(impact?.config, [
                  '配置项',
                  '变更类型',
                  '配置位置',
                  '影响范围',
                  '变更说明',
                ]),
              },
              {
                key: 'compat',
                label: '兼容性',
                children: tableFromRows(impact?.compatibility, [
                  '兼容类型',
                  '兼容项',
                  '当前版本',
                  '目标版本',
                  '兼容性评估',
                  '说明',
                ]),
              },
            ]}
          />
        </Card>

        {/* 需求设计产出物 */}
        <Card size="small" title="需求设计阶段产出物">
          <div className="flex gap-4 min-h-[200px]">
            <ul className="w-56 shrink-0 space-y-1 text-sm">
              {artifacts.map((a) => (
                <li key={`${a.node_id}-${a.artifact}`}>
                  <button
                    type="button"
                    disabled={!a.relative_path || !a.included}
                    className="text-left w-full rounded px-2 py-1 hover:bg-muted/30 disabled:opacity-40"
                    onClick={() => a.relative_path && openArtifact(a.relative_path)}
                  >
                    <FileText className="inline h-3 w-3 mr-1" />
                    {a.node_name || a.node_id} / {a.artifact}
                    {!a.included ? (
                      <Tag className="ml-1" bordered={false}>
                        未纳入
                      </Tag>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex-1 min-w-0 rounded border border-border/40 p-3 overflow-auto max-h-80">
              {previewLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : artifactPreview ? (
                <ReviewMarkdown content={artifactPreview.content} />
              ) : (
                <Text type="secondary">点击左侧产出物预览</Text>
              )}
            </div>
          </div>
        </Card>

        {/* 拆单预览 */}
        <Card size="small" title="拆单预览（通过后落盘）">
          <Table
            size="small"
            columns={splitColumns}
            dataSource={previewTasks.map((t, i) => ({ ...t, key: String(i) }))}
            pagination={false}
            scroll={{ x: 900 }}
          />
        </Card>

        {/* 人工评审 */}
        <Card size="small" title="人工评审">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态</span>
            <Tag
              color={
                humanStatus === 'approved'
                  ? 'green'
                  : humanStatus === 'rejected'
                    ? 'red'
                    : 'processing'
              }
            >
              {humanStatus === 'approved'
                ? '通过'
                : humanStatus === 'rejected'
                  ? '不通过'
                  : '待评审'}
            </Tag>
          </div>
          <TextArea
            rows={4}
            placeholder="填写人工评审意见（不通过时必填）"
            value={humanComment}
            onChange={(e) => setHumanComment(e.target.value)}
            disabled={readOnly}
          />
        </Card>
      </div>

      {!readOnly ? (
        <div className="shrink-0 border-t border-border/50 bg-[color:var(--panel)] px-6 py-4 flex justify-end gap-3">
          <Button
            danger
            icon={<XCircle className="h-4 w-4" />}
            loading={submitting}
            onClick={() => submit('reject')}
          >
            评审不通过
          </Button>
          <Button
            type="primary"
            icon={<CheckCircle2 className="h-4 w-4" />}
            loading={submitting}
            onClick={() => submit('approve')}
          >
            通过并确认拆单
          </Button>
        </div>
      ) : null}
    </div>
  );
}
