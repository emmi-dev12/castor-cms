'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

const inp = {
  className: 'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150',
  style: { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' } as React.CSSProperties,
};

export function NewSiteForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const site = await api.sites.create({
        name: fd.get('name') as string,
        rootUrl: fd.get('rootUrl') as string,
        clientPassword: fd.get('clientPassword') as string,
      }, token);
      router.push(`/admin/sites/${site.siteId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create site');
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-5 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,112,112,0.2)', color: 'var(--red)' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { name: 'name', label: 'Site name', type: 'text', placeholder: 'Acme Corp' },
          { name: 'rootUrl', label: 'Root URL', type: 'url', placeholder: 'https://example.com' },
          { name: 'clientPassword', label: 'Client password', type: 'password', placeholder: 'Min 8 characters' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-xs mb-2 tracking-wide" style={{ color: 'var(--text-3)' }}>
              {f.label.toUpperCase()}
            </label>
            <input {...inp} name={f.name} type={f.type} required
              minLength={f.name === 'clientPassword' ? 8 : undefined}
              placeholder={f.placeholder} />
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg py-3 font-medium text-sm transition-all duration-150 mt-2"
          style={{ background: 'var(--accent)', color: '#0A0808', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Creating…' : 'Create Site →'}
        </button>
      </form>
    </>
  );
}
