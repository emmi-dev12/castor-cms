import Link from 'next/link';
import { requireOwnerSession } from '@/lib/auth';
import { api } from '@/lib/api';
import type { SiteConfig } from '@castor/types';
import { CastorLogo } from '@/components/CastorLogo';

export default async function AdminPage() {
  const { token } = await requireOwnerSession();
  let sites: SiteConfig[] = [];
  try { sites = await api.sites.list(token); } catch {}
  const active = sites.filter(s => s.status !== 'deleted');

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b px-8 py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(9,8,10,0.85)' }}>
        <div className="flex items-center gap-3">
          <CastorLogo size={28} />
          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-2)' }}>
            admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/settings"
            className="text-sm px-4 py-2 rounded-lg transition-all duration-150 hover-surface2"
            style={{ color: 'var(--text-2)', border: '1px solid var(--border)', background: 'transparent' }}>
            Settings
          </Link>
          <Link href="/admin/sites/new"
            className="text-sm px-4 py-2 rounded-lg font-medium transition-all duration-150"
            style={{ background: 'var(--accent)', color: '#0A0808' }}>
            + New Site
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10 animate-fade-up">
          {[
            { label: 'Sites', value: active.length },
            { label: 'Active', value: active.filter(s => s.status === 'active').length },
            { label: 'Adapters', value: [...new Set(active.map(s => s.deployAdapter))].join(' · ') || '—' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>
                {stat.label}
              </p>
              <p className="font-display text-3xl font-medium" style={{ color: 'var(--text)' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Sites */}
        <div className="animate-fade-up delay-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
              Your Sites
            </p>
          </div>

          {active.length === 0 ? (
            <div className="rounded-xl p-16 text-center"
              style={{ background: 'var(--surface)', border: '1px dashed var(--border-2)' }}>
              <p className="font-display text-2xl font-medium mb-3" style={{ color: 'var(--text-2)' }}>
                No sites yet
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
                Add a site to start managing content
              </p>
              <Link href="/admin/sites/new"
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg font-medium transition-all"
                style={{ background: 'var(--accent)', color: '#0A0808' }}>
                Create your first site →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((site, i) => (
                <Link key={site.siteId} href={`/admin/sites/${site.siteId}`}
                  className="group flex items-center gap-5 rounded-xl px-6 py-4 transition-all duration-200 animate-fade-up hover-surface"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    animationDelay: `${i * 0.06}s`,
                  }}>

                  {/* Favicon placeholder */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-display text-base font-medium"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {site.name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                      {site.name}
                    </p>
                    <p className="text-xs truncate font-mono" style={{ color: 'var(--text-3)' }}>
                      {site.rootUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                      {site.deployAdapter}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      site.status === 'active' ? '' : ''
                    }`}
                      style={site.status === 'active'
                        ? { background: 'var(--green-dim)', color: 'var(--green)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                      {site.status}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                      style={{ color: 'var(--text-3)' }}>
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
