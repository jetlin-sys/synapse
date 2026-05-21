/**
 * 研发会议室统一人机确认表单（questionnaire v1.0）。
 * 配置 schema 驱动；会议室介入弹窗中嵌入提交或只读预览。
 */
import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronRight, ListChecks, Sparkles } from 'lucide-react';
import { Button, Form, Input, Progress } from 'antd';

const { TextArea } = Input;

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ── Questionnaire v1.0 ── */
export type HitlQuestionType = 'single' | 'multiple' | 'boolean' | 'text' | 'textarea';
export type HitlOptionStyle = 'radio' | 'checkbox' | 'boolean';

export interface HitlQuestionOption {
  /** 选项主键；LLM 偶尔输出 `id` 而不是 `value`，渲染时会自动回退 */
  value: string;
  /** 兼容字段：当 LLM 输出 ``{"id": "...", "label": "..."}`` 时使用 */
  id?: string;
  label: string;
  selected?: boolean;
}

/** 归一化选项主键：避免 LLM 漏 value 导致全部选项共享 undefined 主键。 */
function optionKey(o: HitlQuestionOption, idx: number): string {
  const raw =
    (typeof o.value === 'string' && o.value.trim()) ||
    (typeof o.id === 'string' && o.id.trim()) ||
    (typeof o.label === 'string' && o.label.trim()) ||
    '';
  return raw || `opt_${idx}`;
}

export interface HitlQuestionRender {
  layout?: 'vertical' | 'horizontal' | 'grid';
  optionStyle?: HitlOptionStyle;
  showProgress?: boolean;
  progress?: { current: number; total: number };
}

export interface HitlQuestion {
  id: string;
  type: HitlQuestionType;
  title: string;
  context?: string;
  options?: HitlQuestionOption[];
  inputEnabled?: boolean;
  inputPlaceholder?: string;
  required?: boolean;
  render?: HitlQuestionRender;
}

export type HitlSummaryKind = 'exception' | 'result_confirm' | 'interactive';

export interface HitlFormSchema {
  type?: 'questionnaire';
  version?: string;
  title?: string;
  description?: string;
  questions?: HitlQuestion[];
  render?: {
    layout?: 'stepped' | 'flat';
    showOverallProgress?: boolean;
    accent?: 'blue' | 'violet' | 'emerald';
    animate?: boolean;
  };
  /** 工具 / 异常默认模板写入：表单上方展示给用户的 markdown 摘要 */
  summary_markdown?: string;
  /** 异常原因短文本（与 summary_kind 一起渲染醒目卡片） */
  summary_reason?: string;
  /** 介入类型；驱动摘要的颜色 / 图标 */
  summary_kind?: HitlSummaryKind;
  intervention_kind?: HitlSummaryKind;
}

export type HitlFormValues = Record<string, string | string[] | boolean>;

function isQuestionnaire(schema: HitlFormSchema): boolean {
  return Array.isArray(schema.questions) && schema.questions.length > 0;
}

function isBooleanQuestion(q: HitlQuestion): boolean {
  if (q.render?.optionStyle === 'boolean') return true;
  const opts = q.options || [];
  return (
    opts.length === 2 &&
    opts.every((o, idx) => {
      const key = optionKey(o, idx);
      return key === 'true' || key === 'false';
    })
  );
}

function accentClasses(accent?: string): { ring: string; bg: string; text: string; bar: string } {
  switch (accent) {
    case 'violet':
      return {
        ring: 'ring-violet-500/40 border-violet-500/50 bg-violet-500/10',
        bg: 'from-violet-600/20 via-violet-500/5 to-transparent',
        text: 'text-violet-400',
        bar: 'bg-violet-500',
      };
    case 'emerald':
      return {
        ring: 'ring-emerald-500/40 border-emerald-500/50 bg-emerald-500/10',
        bg: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
        text: 'text-emerald-400',
        bar: 'bg-emerald-500',
      };
    default:
      return {
        ring: 'ring-blue-500/40 border-blue-500/50 bg-blue-500/10',
        bg: 'from-blue-600/25 via-blue-500/8 to-transparent',
        text: 'text-blue-400',
        bar: 'bg-blue-500',
      };
  }
}

/* ── Questionnaire UI ── */
const HitlQuestionnaireForm: React.FC<{
  schema: HitlFormSchema;
  summaryMarkdown?: string;
  preview?: boolean;
  initialValues?: HitlFormValues;
  onSubmit?: (values: HitlFormValues) => void;
  submitLabel?: string;
}> = ({
  schema,
  summaryMarkdown,
  preview = false,
  initialValues,
  onSubmit,
  submitLabel = '提交确认',
}) => {
  const questions = schema.questions || [];
  const stepped = schema.render?.layout === 'stepped';
  const accent = accentClasses(schema.render?.accent);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    questions.forEach((q) => {
      init[q.id] = new Set();
    });
    return init;
  });
  const [customTexts, setCustomTexts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    questions.forEach((q) => {
      init[q.id] = '';
    });
    return init;
  });
  const [showCustom, setShowCustom] = useState<Record<string, boolean>>({});

  const currentQ = questions[step];
  const totalSteps = questions.length;
  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const sel = selections[q.id];
      const custom = customTexts[q.id]?.trim();
      if (q.type === 'textarea' || q.type === 'text') return !!custom;
      return (sel && sel.size > 0) || !!custom;
    }).length;
  }, [questions, selections, customTexts]);

  const toggleOption = useCallback((q: HitlQuestion, value: string) => {
    if (preview) return;
    const multi = q.type === 'multiple' || q.render?.optionStyle === 'checkbox';
    setSelections((prev) => {
      const next = new Set(prev[q.id]);
      if (multi) {
        if (next.has(value)) next.delete(value);
        else next.add(value);
      } else if (next.has(value)) {
        next.clear();
      } else {
        next.clear();
        next.add(value);
      }
      return { ...prev, [q.id]: next };
    });
  }, [preview]);

  const questionAnswered = (q: HitlQuestion): boolean => {
    const sel = selections[q.id];
    const custom = customTexts[q.id]?.trim();
    if (q.type === 'textarea' || q.type === 'text') return !!custom || !q.required;
    if (q.required) return (sel?.size ?? 0) > 0 || !!custom;
    return true;
  };

  const canProceed = currentQ ? questionAnswered(currentQ) : false;
  const isLastStep = step >= totalSteps - 1;

  const buildValues = (): HitlFormValues => {
    const values: HitlFormValues = {};
    questions.forEach((q) => {
      const sel = selections[q.id];
      const custom = customTexts[q.id]?.trim();
      if (q.type === 'textarea' || q.type === 'text') {
        if (custom) values[q.id] = custom;
        return;
      }
      const arr = sel ? Array.from(sel) : [];
      if (custom) arr.push(`OTHER:${custom}`);
      if (arr.length === 0) return;
      values[q.id] =
        q.type === 'multiple' || q.render?.optionStyle === 'checkbox'
          ? arr
          : arr[0];
    });
    return values;
  };

  const handleSubmit = () => {
    if (preview || !onSubmit) return;
    onSubmit(buildValues());
  };

  const renderOptions = (q: HitlQuestion) => {
    const opts = q.options || [];
    const sel = selections[q.id] || new Set<string>();
    const boolStyle = isBooleanQuestion(q);
    const multi = q.type === 'multiple' || q.render?.optionStyle === 'checkbox';

    if (boolStyle) {
      return (
        <div className="flex gap-3 mt-3">
          {opts.map((o, idx) => {
            const key = optionKey(o, idx);
            const active = sel.has(key);
            const yes = key === 'true';
            return (
              <motion.button
                key={key}
                type="button"
                disabled={preview}
                whileHover={preview ? undefined : { scale: 1.02 }}
                whileTap={preview ? undefined : { scale: 0.98 }}
                onClick={() => toggleOption(q, key)}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? yes
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'border-rose-500/60 bg-rose-500/15 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                    : 'border-border/50 bg-background/40 text-muted-foreground hover:border-border'
                }`}
              >
                {o.label}
              </motion.button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 mt-3">
        {opts.map((o, idx) => {
          const key = optionKey(o, idx);
          const active = sel.has(key);
          const letter = OPTION_LETTERS[idx] || String(idx + 1);
          const isDecision = q.id === 'decision';
          const approve = key === 'approve';
          const reject = key === 'reject';
          return (
            <motion.button
              key={key}
              type="button"
              disabled={preview}
              whileHover={preview ? undefined : { x: 2 }}
              onClick={() => toggleOption(q, key)}
              className={`group flex items-start gap-3 w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                active
                  ? isDecision && approve
                    ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    : isDecision && reject
                      ? 'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/30'
                      : accent.ring
                  : 'border-border/40 bg-background/30 hover:border-border/70 hover:bg-muted/20'
              }`}
            >
              <span
                className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors ${
                  active
                    ? isDecision && approve
                      ? 'bg-emerald-500 text-white'
                      : isDecision && reject
                        ? 'bg-rose-500 text-white'
                        : `${accent.bar} text-white`
                    : 'bg-muted/60 text-muted-foreground group-hover:bg-muted'
                } ${multi ? 'rounded-md' : 'rounded-full'}`}
              >
                {multi ? (active ? '✓' : '') : letter}
              </span>
              <span className={`text-xs leading-relaxed pt-0.5 ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                {o.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderQuestionBody = (q: HitlQuestion) => (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground leading-snug">
          {q.title}
          {q.required ? <span className="text-rose-400 ml-1">*</span> : null}
        </h4>
        {q.render?.showProgress !== false && q.render?.progress ? (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
            {q.render.progress.current}/{q.render.progress.total}
          </span>
        ) : null}
      </div>
      {q.context ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed pl-0.5 border-l-2 border-border/50 pl-2.5 mt-1.5">
          {q.context}
        </p>
      ) : null}
      {(q.type === 'textarea' || q.type === 'text') && (
        <TextArea
          rows={q.type === 'textarea' ? 4 : 2}
          disabled={preview}
          value={customTexts[q.id] || ''}
          onChange={(e) => setCustomTexts((p) => ({ ...p, [q.id]: e.target.value }))}
          placeholder={q.inputPlaceholder || '请输入…'}
          className="mt-3 bg-background/50 border-border/50 text-foreground text-xs resize-none"
        />
      )}
      {optsLength(q) > 0 ? renderOptions(q) : null}
      {q.inputEnabled && q.type !== 'textarea' && q.type !== 'text' ? (
        showCustom[q.id] ? (
          <Input
            autoFocus
            disabled={preview}
            value={customTexts[q.id] || ''}
            onChange={(e) => setCustomTexts((p) => ({ ...p, [q.id]: e.target.value }))}
            placeholder={q.inputPlaceholder || '或者你的答案：'}
            className="mt-2 bg-background/50 border-dashed border-border/60 text-xs"
          />
        ) : (
          <button
            type="button"
            disabled={preview}
            onClick={() => setShowCustom((p) => ({ ...p, [q.id]: true }))}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-lg px-3 py-1.5 w-full text-left transition-colors"
          >
            {q.inputPlaceholder || '或者你的答案…'}
          </button>
        )
      ) : null}
    </div>
  );

  const visibleQuestions = stepped ? (currentQ ? [currentQ] : []) : questions;

  return (
    <div className="space-y-4">
      {schema.render?.showOverallProgress !== false && totalSteps > 1 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className={`w-3 h-3 ${accent.text}`} />
              确认进度
            </span>
            <span>{answeredCount}/{totalSteps} 已答</span>
          </div>
          <Progress
            percent={Math.round((answeredCount / totalSteps) * 100)}
            showInfo={false}
            strokeColor={{ from: '#3b82f6', to: '#8b5cf6' }}
            trailColor="rgba(128,128,128,0.15)"
            size="small"
          />
        </div>
      ) : null}

      {(() => {
        if (preview) return null;
        const kind: HitlSummaryKind | undefined =
          schema.summary_kind ?? schema.intervention_kind;
        const reason = (schema.summary_reason || '').trim();
        const fromSchema = (schema.summary_markdown || '').trim();
        const fromProp = (summaryMarkdown || '').trim();
        const body = fromSchema || fromProp;
        if (!body && !reason) return null;
        const isException = kind === 'exception';
        const isResult = kind === 'result_confirm';
        const palette = isException
          ? {
              card: 'border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/25',
              chip: 'bg-violet-500/20 text-violet-200 border border-violet-500/40',
              label: 'text-violet-200/90',
              Icon: AlertTriangle,
              title: '异常摘要',
              hint: '系统在主控未通过结构化方式提交问卷时进入异常门控；请审阅以下原因后选择处置方式。',
            }
          : isResult
          ? {
              card: 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/25',
              chip: 'bg-blue-500/20 text-blue-200 border border-blue-500/40',
              label: 'text-blue-200/90',
              Icon: CheckCircle2,
              title: '待确认总结',
              hint: '请审阅以下待确认要点；填写表单后系统将归档并推进下一节点。',
            }
          : {
              card: 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/25',
              chip: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
              label: 'text-emerald-200/90',
              Icon: ListChecks,
              title: '澄清要点',
              hint: '主控已收集到以下澄清要点，请逐题填写后提交。',
            };
        const Icon = palette.Icon;
        return (
          <div className={`rounded-xl border p-3.5 backdrop-blur-sm ${palette.card}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${palette.label}`}>
                <Icon className="w-3.5 h-3.5" />
                {palette.title}
              </div>
              {kind ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${palette.chip}`}>
                  {kind}
                </span>
              ) : null}
            </div>
            {reason ? (
              <div className="text-[12px] font-medium text-foreground/95 mb-2 leading-relaxed">
                {reason}
              </div>
            ) : null}
            {body ? (
              <pre className="text-[11px] text-foreground/85 whitespace-pre-wrap font-sans leading-relaxed m-0 max-h-52 overflow-y-auto custom-scrollbar">
                {body}
              </pre>
            ) : null}
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{palette.hint}</p>
          </div>
        );
      })()}

      <AnimatePresence mode="wait">
        {visibleQuestions.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="rounded-xl border border-border/50 bg-background/40 p-4 backdrop-blur-sm shadow-sm"
          >
            {renderQuestionBody(q)}
          </motion.div>
        ))}
      </AnimatePresence>

      {!preview && onSubmit ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          {stepped && step > 0 ? (
            <Button size="small" onClick={() => setStep((s) => s - 1)}>
              上一题
            </Button>
          ) : (
            <span />
          )}
          {stepped && !isLastStep ? (
            <Button
              type="primary"
              size="small"
              disabled={!canProceed}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              iconPosition="end"
              onClick={() => setStep((s) => s + 1)}
              className="bg-blue-600 hover:bg-blue-500 border-none shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
            >
              下一题
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              disabled={!questions.every(questionAnswered)}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-500 border-none shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
            >
              {submitLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

function optsLength(q: HitlQuestion): number {
  return q.options?.length ?? 0;
}

/* ── Entry ── */
export const MeetingHitlForm: React.FC<{
  schema: HitlFormSchema;
  summaryMarkdown?: string;
  preview?: boolean;
  initialValues?: HitlFormValues;
  onSubmit?: (values: HitlFormValues) => void;
  submitLabel?: string;
  className?: string;
}> = ({
  schema,
  summaryMarkdown,
  preview = false,
  initialValues,
  onSubmit,
  submitLabel = '提交确认',
  className = '',
}) => {
  const questionnaire = isQuestionnaire(schema);
  const accent = accentClasses(schema.render?.accent);

  return (
    <div
      className={`rd-meeting-hitl-form overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${accent.bg} ${className}`}
    >
      <div className="p-4 space-y-3">
        {schema.title ? (
          <div className="flex items-center gap-2">
            <div className={`w-1 h-5 rounded-full ${accent.bar}`} />
            <div className="text-sm font-semibold text-foreground/95">{schema.title}</div>
          </div>
        ) : null}
        {schema.description ? (
          <p className="text-[11px] text-muted-foreground leading-relaxed pl-3">{schema.description}</p>
        ) : null}

        {questionnaire ? (
          <HitlQuestionnaireForm
            schema={schema}
            summaryMarkdown={summaryMarkdown}
            preview={preview}
            initialValues={initialValues}
            onSubmit={onSubmit}
            submitLabel={submitLabel}
          />
        ) : (
          <p className="text-[11px] text-amber-400/90 pl-3">
            表单配置无效：须包含非空的 <code className="text-[10px]">questions</code> 数组（questionnaire v1.0）。
          </p>
        )}

        {preview && questionnaire ? (
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
            预览：节点开启「人工确认」后，智能体输出待确认总结，用户逐项回答上述问题提交；
            分步向导支持进度追踪与自定义补充。确认通过后系统才写入归档产物并推进节点。
          </p>
        ) : null}
      </div>
    </div>
  );
};
