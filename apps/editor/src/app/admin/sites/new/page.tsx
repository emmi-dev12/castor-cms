import Link from 'next/link';
import { requireOwnerSession } from '@/lib/auth';
import { NewSiteForm } from './NewSiteForm';

export default async function NewSitePage() {
  const { token } = await requireOwnerSession();

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="border-b px-8 py-5 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(9,8,10,0.85)' }}>
        <Link href="/admin" className="text-sm transition-colors" style={{ color: 'var(--text-3)' }}>
          ← Admin
        </Link>
        <span style={{ color: 'var(--border-2)' }}>/</span>
        <span className="text-sm font-medium">New Site</span>
      </header>

      <div className="max-w-lg mx-auto px-8 py-12">
        <h1 className="font-display text-3xl font-medium mb-2">Add a site</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
          Enter your site details. You can ingest pages after creation.
        </p>
        <NewSiteForm token={token} />
      </div>
    </main>
  );
}
