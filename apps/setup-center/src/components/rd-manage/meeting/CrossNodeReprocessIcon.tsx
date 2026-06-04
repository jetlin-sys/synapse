import React, { useId } from 'react';

type CrossNodeReprocessIconProps = {
  className?: string;
  /** 重处理进行中：弧线流动 + 光晕脉冲 */
  spinning?: boolean;
};

/**
 * 同阶段历史节点「跨节点重新处理」：多节点流水线 + 回退重跑弧线。
 * 语义：从选中节点清理至当前节点的区间数据后，从该节点重新执行。
 */
export function CrossNodeReprocessIcon({ className = 'h-3.5 w-3.5', spinning }: CrossNodeReprocessIconProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `cross-node-reprocess-grad-${uid}`;
  const glowId = `cross-node-reprocess-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rd-cross-node-reprocess-icon shrink-0 ${spinning ? 'rd-cross-node-reprocess-icon--spinning' : ''} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="20" x2="22" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="45%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 流水线节点：左→右递进，右侧为当前节点 */}
      <rect
        x="2"
        y="13.5"
        width="5.5"
        height="7"
        rx="1.25"
        stroke={`url(#${gradId})`}
        strokeWidth="1.35"
        fill={`url(#${gradId})`}
        fillOpacity="0.22"
        className="rd-cross-node-reprocess-node rd-cross-node-reprocess-node--target"
      />
      <rect
        x="9.25"
        y="9.5"
        width="5.5"
        height="7"
        rx="1.25"
        stroke={`url(#${gradId})`}
        strokeWidth="1.2"
        fill={`url(#${gradId})`}
        fillOpacity="0.12"
        strokeOpacity="0.75"
        className="rd-cross-node-reprocess-node"
      />
      <rect
        x="16.5"
        y="5.5"
        width="5.5"
        height="7"
        rx="1.25"
        stroke={`url(#${gradId})`}
        strokeWidth="1.1"
        fill={`url(#${gradId})`}
        fillOpacity="0.06"
        strokeOpacity="0.45"
        className="rd-cross-node-reprocess-node rd-cross-node-reprocess-node--current"
      />

      {/* 节点间连线 */}
      <path
        d="M7.75 16.5 L9.25 13"
        stroke={`url(#${gradId})`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M14.75 12.5 L16.5 9"
        stroke={`url(#${gradId})`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* 回退重跑弧线（跨节点清理区间） */}
      <path
        d="M21.5 4.5 C15.5 -0.5 7 5.5 4.5 12.5"
        stroke={`url(#${gradId})`}
        strokeWidth="1.85"
        strokeLinecap="round"
        fill="none"
        filter={`url(#${glowId})`}
        className="rd-cross-node-reprocess-arc"
        pathLength={100}
      />
      <path
        d="M4.5 12.5 L2.6 10.8 M4.5 12.5 L6.4 10.8"
        stroke={`url(#${gradId})`}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rd-cross-node-reprocess-arc-head"
      />

      {/* 目标节点高亮：重跑起点 */}
      <circle
        cx="4.75"
        cy="17"
        r="1.15"
        fill="#22d3ee"
        className="rd-cross-node-reprocess-target-dot"
        style={{ transformOrigin: '4.75px 17px' }}
      />
    </svg>
  );
}
