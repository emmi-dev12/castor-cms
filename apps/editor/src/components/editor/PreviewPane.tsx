'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PageSchema, DesignTokens } from '@castor/types';

interface ActiveTokens {
  colorIdx: number;
  spacing: import('@castor/types').SpacingPreset;
  fontIdx: number;
}

interface Props {
  page: PageSchema;
  tokens?: DesignTokens;
  activeTokens?: ActiveTokens;
  token: string;
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function PreviewPane({ page, token }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}/api/sites/${page.siteId}/pages/${page.pageId}/template-html`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let raw = await res.text();
      // Inject base tag so relative assets resolve against the original site
      const baseTag = `<base href="${page.url.replace(/\/$/, '')}/">`;
      raw = raw.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      setHtml(raw);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [page.siteId, page.pageId, page.url, token]);

  // Re-fetch with debounce when slot values change
  useEffect(() => {
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchPreview, page.slots]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-2.5 shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          Preview {loading && <span style={{ color: 'var(--text-3)' }}>— loading…</span>}
        </span>
        <span className="text-xs font-mono truncate max-w-xs" style={{ color: 'var(--text-3)' }}>{page.url}</span>
      </div>
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      ) : (
        <iframe
          srcDoc={html ?? undefined}
          sandbox="allow-same-origin allow-scripts"
          className="flex-1 w-full border-0"
          style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}
          title="Page preview"
        />
      )}
    </div>
  );
}
