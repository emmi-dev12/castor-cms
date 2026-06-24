'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Props {
  siteId: string;
  token: string;
  defaultUrl: string;
}

export function IngestForm({ siteId, token, defaultUrl }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl);
  const [depth, setDepth] = useState(2);
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function pollUntilDone(ingestId: string) {
    const start = Date.now();
    while (Date.now() - start < 120_000) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`${API}/api/sites/${siteId}/ingest/${ingestId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const job = await res.json() as { status: string; pagesDiscovered: number };
          if (job.status === 'complete') {
            setStatus('done');
            setMessage(`Done — ${job.pagesDiscovered} page(s) discovered.`);
            router.refresh();
            return;
          }
          if (job.status === 'failed') {
            setStatus('error');
            setMessage('Ingest failed on the server.');
            return;
          }
        }
      } catch { /* keep polling */ }
    }
    setStatus('error');
    setMessage('Timed out waiting for ingest.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`${API}/api/sites/${siteId}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url, depth }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { ingestId: string };
      setStatus('polling');
      setMessage('Crawling… this may take 10–30 s');
      void pollUntilDone(data.ingestId);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to start ingest.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="block text-xs text-gray-400 mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs text-gray-400 mb-1">Depth</label>
        <input
          type="number"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          min={0}
          max={5}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading' || status === 'polling'}
        className="text-sm font-medium rounded-lg px-4 py-2 transition-all whitespace-nowrap"
        style={{
          background: status === 'done' ? 'var(--green-dim)' : 'var(--accent)',
          color: status === 'done' ? 'var(--green)' : '#0A0808',
          border: status === 'done' ? '1px solid rgba(82,200,120,0.2)' : 'none',
          opacity: (status === 'loading' || status === 'polling') ? 0.6 : 1,
        }}
      >
        {status === 'loading' ? 'Starting…' : status === 'polling' ? 'Crawling…' : status === 'done' ? '✓ Done' : 'Start Ingest'}
      </button>

      {message && (
        <p className="text-xs mt-1 sm:mt-0" style={{ color: status === 'error' ? 'var(--red)' : status === 'done' ? 'var(--green)' : 'var(--text-3)' }}>
          {message}
        </p>
      )}
    </form>
  );
}
