'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Props { siteId: string; token: string; siteName: string; }

export function DeleteSiteButton({ siteId, token, siteName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`${API}/api/sites/${siteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push('/admin');
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Delete "{siteName}"?</span>
        <button onClick={handleDelete} disabled={deleting}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(240,112,112,0.2)' }}>
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-2)' }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-xs px-3 py-1.5 rounded-lg transition-all"
      style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-2)' }}>
      Delete site
    </button>
  );
}
