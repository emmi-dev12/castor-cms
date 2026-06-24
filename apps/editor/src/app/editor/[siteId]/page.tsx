import Link from 'next/link';
import { requireAnySession } from '@/lib/auth';
import { api } from '@/lib/api';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ siteId: string }>;
}

export default async function SiteEditorIndexPage({ params }: Props) {
  const { siteId } = await params;
  const { token, payload } = await requireAnySession();

  if (payload.role === 'client' && payload.siteId !== siteId) redirect('/login');

  const pages = await api.pages.list(siteId, token).catch(() => []);
  const activePages = pages.filter((p) => p.status === 'active');

  // Auto-redirect if only one page
  if (activePages.length === 1) {
    redirect(`/editor/${siteId}/${activePages[0].pageId}`);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Select a Page to Edit</h1>
      </header>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        {activePages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">No active pages found.</p>
        ) : (
          activePages.map((page) => (
            <Link
              key={page.pageId}
              href={`/editor/${siteId}/${page.pageId}`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
            >
              <p className="font-medium">{page.title}</p>
              <p className="text-gray-500 text-sm mt-0.5">{page.url}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
