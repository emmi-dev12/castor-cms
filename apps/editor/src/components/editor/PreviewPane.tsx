'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PageSchema } from '@castor/types';

interface Props {
  page: PageSchema;
  token: string;
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

function substituteSlots(template: string, page: PageSchema): string {
  let html = template;
  for (const [slotId, descriptor] of Object.entries(page.slots)) {
    const placeholder = `{{slot:${slotId}}}`;
    const val = descriptor.currentValue;
    let replacement = '';
    if (val.type === 'text') replacement = val.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    else if (val.type === 'image') replacement = val.src.replace(/"/g,'&quot;');
    else if (val.type === 'link') replacement = val.href.replace(/"/g,'&quot;');
    html = html.split(placeholder).join(replacement);
  }
  return html;
}

export function PreviewPane({ page, token }: Props) {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const templateRef = useRef<string | null>(null);

  // Fetch raw template once (or when page changes)
  useEffect(() => {
    setTemplate(null);
    setLoadError(null);
    fetch(`${API}/api/sites/${page.siteId}/pages/${page.pageId}/raw-template`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        templateRef.current = raw;
        setTemplate(raw);
      })
      .catch((err) => setLoadError(String(err)));
  }, [page.siteId, page.pageId, token]);

  // Build the srcdoc — instant on every slot change since it's pure client-side
  const srcDoc = useCallback(() => {
    if (!template) return undefined;
    const base = page.url.replace(/\/$/, '') + '/';
    let html = substituteSlots(template, page);
    html = html.replace(/(<head[^>]*>)/i, `$1<base href="${base}">`);
    return html;
  }, [template, page])();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <div className="px-4 py-2 shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {!template && !loadError ? 'Loading preview…' : 'Live Preview'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono truncate max-w-xs" style={{ color: 'var(--text-3)' }}>{page.url}</span>
          <a href={page.url} target="_blank" rel="noopener noreferrer"
            className="text-xs transition-colors" style={{ color: 'var(--accent)' }} title="Open original">
            ↗
          </a>
        </div>
      </div>
      {loadError ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
            Preview unavailable — template not yet ingested or still loading.
          </p>
        </div>
      ) : (
        <iframe
          key={page.pageId}
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-scripts allow-popups"
          className="flex-1 w-full border-0 bg-white"
          title="Live preview"
        />
      )}
    </div>
  );
}
