'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PageSchema, SlotDescriptor } from '@castor/types';
import { api, ApiError } from '@/lib/api';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
type Visibility = SlotDescriptor['visibility'];

const VIS: Record<Visibility, { label: string; color: string; bg: string; border: string }> = {
  'client-visible': { label: 'Client', color: 'var(--green)', bg: 'var(--green-dim)', border: 'rgba(82,200,120,0.25)' },
  'owner-only':     { label: 'Owner',  color: 'var(--blue)',  bg: 'var(--blue-dim)',  border: 'rgba(104,152,232,0.25)' },
  frozen:           { label: 'Frozen', color: 'var(--text-3)',bg: 'var(--surface-2)', border: 'var(--border-2)' },
};

interface Props { initialPage: PageSchema; token: string; siteId: string; }

export function CurationShell({ initialPage, token, siteId }: Props) {
  const router = useRouter();
  const [vis, setVis] = useState<Record<string, Visibility>>(
    Object.fromEntries(Object.entries(initialPage.slots).map(([id, d]) => [id, d.visibility]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState<Visibility | 'all'>('all');
  const slotList = Object.values(initialPage.slots);
  const filtered = filter === 'all' ? slotList : slotList.filter(s => vis[s.slotId] === filter);
  const counts = slotList.reduce((a, s) => { a[vis[s.slotId]]++; return a; }, { 'client-visible': 0, 'owner-only': 0, frozen: 0 } as Record<Visibility, number>);

  async function setVisibility(slotId: string, v: Visibility) {
    setSaving(slotId);
    try {
      await fetch(`${API}/api/sites/${siteId}/pages/${initialPage.pageId}/slots/${slotId}/visibility`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visibility: v }),
      });
      setVis(prev => ({ ...prev, [slotId]: v }));
    } finally { setSaving(null); }
  }

  async function setAll(v: Visibility) {
    for (const s of slotList) await setVisibility(s.slotId, v);
  }

  async function confirm() {
    setConfirming(true);
    try {
      await api.pages.confirmCuration(siteId, initialPage.pageId, token);
      router.push(`/editor/${siteId}/${initialPage.pageId}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed');
      setConfirming(false);
    }
  }

  const tabs: Array<{ key: Visibility | 'all'; label: string; count: number }> = [
    { key: 'all', label: 'All', count: slotList.length },
    { key: 'client-visible', label: 'Client', count: counts['client-visible'] },
    { key: 'owner-only', label: 'Owner', count: counts['owner-only'] },
    { key: 'frozen', label: 'Frozen', count: counts.frozen },
  ];

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(9,8,10,0.9)' }}>
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>Slot Curation</p>
          <div className="flex items-center gap-3">
            <p className="font-medium">{initialPage.title}</p>
            <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{initialPage.url}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {(['client-visible', 'frozen'] as Visibility[]).map(v => (
              <button key={v} onClick={() => setAll(v)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }}>
                All {VIS[v].label}
              </button>
            ))}
          </div>
          <button onClick={confirm} disabled={confirming}
            className="text-sm px-5 py-2 rounded-lg font-medium transition-all"
            style={{ background: confirming ? 'var(--green-dim)' : 'var(--green)', color: confirming ? 'var(--green)' : '#050F0A', border: confirming ? '1px solid rgba(82,200,120,0.2)' : 'none' }}>
            {confirming ? 'Activating…' : '✓ Activate Page'}
          </button>
        </div>
      </header>

      {/* Summary bar */}
      <div className="border-b px-8 py-3 flex items-center gap-6"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: filter === t.key ? 'var(--text)' : 'var(--text-3)', fontWeight: filter === t.key ? 500 : 400 }}>
            <span>{t.label}</span>
            <span className="px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--surface-2)', fontSize: '0.7rem',
                color: t.key === 'client-visible' ? 'var(--green)' : t.key === 'owner-only' ? 'var(--blue)' : 'var(--text-3)' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Slot list */}
      <div className="max-w-4xl mx-auto px-8 py-5 space-y-1.5">
        {filtered.map((slot, i) => {
          const val = slot.currentValue;
          const preview = val.type === 'text' ? val.value.slice(0, 90) : val.type === 'link' ? `${val.label} → ${val.href}` : val.src;
          const current = vis[slot.slotId];

          return (
            <div key={slot.slotId}
              className="flex items-center gap-4 rounded-xl px-5 py-3 animate-fade-up"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${i * 0.02}s` }}>

              <span className="text-xs font-mono shrink-0 px-2 py-0.5 rounded"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)', minWidth: '3rem', textAlign: 'center' }}>
                {slot.tagName}
              </span>

              <p className="flex-1 text-sm truncate" style={{ color: 'var(--text-2)' }} title={preview}>
                {preview}
              </p>

              <div className="flex gap-1 shrink-0">
                {(Object.keys(VIS) as Visibility[]).map(v => {
                  const spec = VIS[v];
                  const active = current === v;
                  return (
                    <button key={v} onClick={() => setVisibility(slot.slotId, v)}
                      disabled={saving === slot.slotId}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
                      style={{
                        background: active ? spec.bg : 'transparent',
                        color: active ? spec.color : 'var(--text-3)',
                        border: `1px solid ${active ? spec.border : 'var(--border-2)'}`,
                      }}>
                      {spec.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
