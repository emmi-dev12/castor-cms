import Link from 'next/link';
import { requireOwnerSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { IngestForm } from './IngestForm';
import { EditorLinkButton } from './EditorLinkButton';
import { DeleteSiteButton } from './DeleteSiteButton';

interface Props { params: Promise<{ siteId: string }> }

export default async function SitePage({ params }: Props) {
  const { siteId } = await params;
  const { token } = await requireOwnerSession();
  const [site, pages] = await Promise.all([
    api.sites.get(siteId, token).catch(() => null),
    api.pages.list(siteId, token).catch(() => []),
  ]);
  if (!site) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--text-3)' }}>Site not found.</p>
    </main>
  );

  const statusColor = (status: string) => {
    if (status === 'active') return { background: 'var(--green-dim)', color: 'var(--green)' };
    if (status === 'draft_curation') return { background: 'var(--accent-dim)', color: 'var(--accent)' };
    return { background: 'var(--surface-2)', color: 'var(--text-3)' };
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="border-b px-8 py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(9,8,10,0.85)' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm transition-colors" style={{ color: 'var(--text-3)' }}>
            ← Admin
          </Link>
          <span style={{ color: 'var(--border-2)' }}>/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-display font-medium"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {site.name[0]?.toUpperCase()}
            </div>
            <span className="font-medium">{site.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditorLinkButton siteId={siteId} token={token} />
          <DeleteSiteButton siteId={siteId} token={token} siteName={site.name} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* Ingest */}
        <section className="animate-fade-up">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>
            Ingest Pages
          </p>
          <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Fetch and parse a URL to create editable pages.
            </p>
            <IngestForm siteId={siteId} token={token} defaultUrl={site.rootUrl} />
          </div>
        </section>

        {/* Pages */}
        <section className="animate-fade-up delay-1">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>
            Pages · {pages.length}
          </p>

          {pages.length === 0 ? (
            <div className="rounded-xl p-12 text-center"
              style={{ background: 'var(--surface)', border: '1px dashed var(--border-2)' }}>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                No pages yet — run an ingest above
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page, i) => {
                const href = page.status === 'draft_curation'
                  ? `/admin/sites/${siteId}/pages/${page.pageId}`
                  : `/editor/${siteId}/${page.pageId}`;
                const label = page.status === 'draft_curation' ? 'needs curation' : page.status;
                return (
                  <Link key={page.pageId} href={href}
                    className="group flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-200 animate-fade-up hover-surface"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      animationDelay: `${i * 0.05}s`,
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-0.5">{page.title}</p>
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--text-3)' }}>{page.url}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>v{page.currentVersion}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={statusColor(page.status)}>
                        {label}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" style={{ color: 'var(--text-3)' }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
