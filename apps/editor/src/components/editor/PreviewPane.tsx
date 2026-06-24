'use client';

import { useMemo } from 'react';
import type { PageSchema, DesignTokens, SpacingPreset } from '@castor/types';

interface ActiveTokens {
  colorIdx: number;
  spacing: SpacingPreset;
  fontIdx: number;
}

interface Props {
  page: PageSchema;
  tokens?: DesignTokens;
  activeTokens?: ActiveTokens;
}

const SPACING_VALUES: Record<SpacingPreset, { section: string; elem: string }> = {
  Compact: { section: '12px', elem: '6px'  },
  Normal:  { section: '20px', elem: '10px' },
  Airy:    { section: '32px', elem: '16px' },
};

export function PreviewPane({ page, tokens, activeTokens }: Props) {
  const slots = useMemo(() =>
    Object.values(page.slots).filter(s => s.status === 'active' && s.visibility !== 'frozen'),
  [page.slots]);

  const accentColor = tokens?.colors?.[activeTokens?.colorIdx ?? 0] ?? '#E8A828';
  const fontFamily  = tokens?.fonts?.[activeTokens?.fontIdx ?? 0] ?? 'system-ui, sans-serif';
  const spacing     = SPACING_VALUES[activeTokens?.spacing ?? 'Normal'];

  const previewHtml = useMemo(() => {
    const rows = slots.map(s => {
      const val = s.currentValue;
      if (val.type === 'text') {
        const isHeading = ['h1','h2','h3','h4','h5','h6'].includes(s.tagName);
        const tag = isHeading ? s.tagName : s.tagName === 'button' ? 'button' : 'p';
        const style = isHeading
          ? `font-size:${s.tagName==='h1'?'1.6rem':s.tagName==='h2'?'1.3rem':'1.1rem'};font-weight:700;color:var(--text);margin:0 0 var(--elem-gap)`
          : `font-size:0.9rem;color:var(--text-soft);margin:0 0 var(--elem-gap);line-height:1.6`;
        return `<${tag} style="${style}">${escHtml(val.value)}</${tag}>`;
      }
      if (val.type === 'image') {
        return `<figure style="margin:0 0 var(--elem-gap)">
          <img src="${escAttr(val.src)}" alt="${escAttr(val.alt)}"
            style="max-width:100%;border-radius:8px;display:block" />
          ${val.alt ? `<figcaption style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">${escHtml(val.alt)}</figcaption>` : ''}
        </figure>`;
      }
      if (val.type === 'link') {
        return `<p style="margin:0 0 var(--elem-gap)">
          <a href="${escAttr(val.href)}" style="color:var(--accent);text-decoration:none;font-size:0.9rem"
            onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
            ${escHtml(val.label)}
          </a>
        </p>`;
      }
      return '';
    }).join('\n');

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root {
    --accent: ${accentColor};
    --font: ${fontFamily};
    --section-gap: ${spacing.section};
    --elem-gap: ${spacing.elem};
    --text: #EDE8E3;
    --text-soft: #A89F96;
    --text-muted: #6B6068;
    --bg: #09080A;
    --surface: #111013;
    --border: #221F28;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    padding: 24px;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--section-gap);
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .page-title { font-size: 0.7rem; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
  .accent-dot { color: var(--accent); font-weight: 700; }
  .slot-count { font-size: 0.7rem; color: var(--text-muted); font-family: monospace; }
</style>
</head><body>
<div style="max-width:680px;margin:0 auto">
  <div class="page-header">
    <span class="page-title">${escHtml(page.title)}</span>
    <span class="slot-count">${slots.length} slot${slots.length !== 1 ? 's' : ''} · v${page.currentVersion}</span>
  </div>
  <div style="display:flex;flex-direction:column;gap:var(--section-gap)">
    ${rows}
  </div>
</div>
</body></html>`;
  }, [slots, page.title, page.currentVersion, accentColor, fontFamily, spacing]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-2.5 shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Preview</span>
        <span className="text-xs font-mono truncate max-w-xs" style={{ color: 'var(--text-3)' }}>{page.url}</span>
      </div>
      <iframe
        srcDoc={previewHtml}
        sandbox="allow-same-origin"
        className="flex-1 w-full border-0"
        title="Page preview"
      />
    </div>
  );
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
