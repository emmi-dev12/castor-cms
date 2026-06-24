import { requireAnySession } from '@/lib/auth';
import { api } from '@/lib/api';
import { EditorShell } from '@/components/editor/EditorShell';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ siteId: string; pageId: string }>;
}

export default async function EditorPage({ params }: Props) {
  const { siteId, pageId } = await params;
  const { token, payload } = await requireAnySession();

  // Clients can only access their own site
  if (payload.role === 'client' && payload.siteId !== siteId) {
    redirect('/login');
  }

  const [page, site] = await Promise.all([
    api.pages.get(siteId, pageId, token).catch(() => null),
    api.sites.get(siteId, token).catch(() => null),
  ]);

  if (!page || !site) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Page not found.</p>
      </main>
    );
  }

  return (
    <EditorShell
      initialPage={page}
      site={site}
      token={token}
      role={payload.role}
    />
  );
}
