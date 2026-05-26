import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export interface MarkdownHeading {
  level: number;
  text: string;
  slug: string;
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractMarkdownHeadings(md: string): MarkdownHeading[] {
  const out: MarkdownHeading[] = [];
  for (const line of (md || '').split('\n')) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const text = m[2].replace(/[#*`[\]]/g, '').trim();
    if (!text) continue;
    out.push({ level: m[1].length, text, slug: slugifyHeading(text) });
  }
  return out;
}

function flattenText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (React.isValidElement(node)) return flattenText(node.props.children);
  return '';
}

function buildMarkdownComponents(compact: boolean): Components {
  const h1 = compact ? 'text-lg' : 'text-2xl';
  const h2 = compact ? 'text-base' : 'text-xl';
  const h3 = compact ? 'text-sm' : 'text-lg';

  return {
    h1: ({ children }) => {
      const slug = slugifyHeading(flattenText(children));
      return (
        <h1
          id={slug}
          className={`${h1} font-bold mt-6 mb-4 pb-2 border-b border-cyan-500/25 bg-gradient-to-r from-blue-100 via-cyan-100 to-emerald-100 bg-clip-text text-transparent scroll-mt-24`}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children }) => {
      const slug = slugifyHeading(flattenText(children));
      return (
        <h2
          id={slug}
          className={`${h2} font-semibold mt-5 mb-2 pl-3 border-l-[3px] border-cyan-400/80 text-cyan-50/95 scroll-mt-24`}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const slug = slugifyHeading(flattenText(children));
      return (
        <h3 id={slug} className={`${h3} font-semibold mt-4 mb-1.5 text-foreground/90 scroll-mt-24`}>
          {children}
        </h3>
      );
    },
    p: ({ children }) => (
      <p className="my-2.5 leading-[1.75] text-foreground/88">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-2.5 ml-1 space-y-1.5 list-none [&>li]:relative [&>li]:pl-5 [&>li]:before:content-[''] [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.65em] [&>li]:before:w-1.5 [&>li]:before:h-1.5 [&>li]:before:rounded-full [&>li]:before:bg-cyan-400/70">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2.5 ml-1 space-y-1.5 list-decimal list-inside marker:text-cyan-400/80 marker:font-mono">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed text-foreground/88">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 pl-4 pr-3 py-2.5 rounded-r-lg border-l-[3px] border-violet-400/70 bg-gradient-to-r from-violet-500/10 to-transparent text-foreground/80 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200 hover:decoration-cyan-400/70 transition-colors"
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = Boolean(className?.includes('language-'));
      if (isBlock) {
        return (
          <code className={`${className || ''} font-mono text-[12.5px]`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-100/95 border border-amber-500/25 font-mono text-[12px]"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-4 p-4 rounded-xl border border-border/50 bg-[#0d1117]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_rgba(56,189,248,0.06)] overflow-x-auto custom-scrollbar text-[12.5px] leading-relaxed">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-xl border border-border/50 custom-scrollbar">
        <table className="w-full text-[13px] border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-foreground/90">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold border-b border-border/60 whitespace-nowrap">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 border-b border-border/30 align-top text-foreground/85">{children}</td>
    ),
    tr: ({ children }) => <tr className="even:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{children}</tr>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="text-foreground/80">{children}</em>,
  };
}

export function ReviewMarkdown({
  content,
  compact = false,
  className = '',
}: {
  content: string;
  compact?: boolean;
  className?: string;
}) {
  const components = useMemo(() => buildMarkdownComponents(compact), [compact]);
  return (
    <div className={`review-markdown ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content || '_（空文档）_'}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownToc({
  headings,
  onJump,
}: {
  headings: MarkdownHeading[];
  onJump: (slug: string) => void;
}) {
  const items = headings.filter((h) => h.level >= 2 && h.level <= 3);
  if (items.length < 2) return null;
  return (
    <nav className="rounded-xl border border-border/40 bg-black/25 p-3 text-[11px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">目录</div>
      <ul className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar">
        {items.map((h) => (
          <li key={`${h.slug}-${h.text}`} style={{ paddingLeft: h.level === 3 ? 12 : 0 }}>
            <button
              type="button"
              onClick={() => onJump(h.slug)}
              className="text-left w-full truncate text-cyan-200/85 hover:text-cyan-100 transition-colors"
              title={h.text}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
