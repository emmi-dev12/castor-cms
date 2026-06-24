import { requireOwnerSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { CurationShell } from './CurationShell';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ siteId: string; pageId: string }>;
}

export default async function CurationPage({ params }: Props) {
  const { siteId, pageId } = await params;
  const { token } = await requireOwnerSession();

  const page = await api.pages.get(siteId, pageId, token).catch(() => null);
  if (!page) redirect(`/admin/sites/${siteId}`);

  // Already active — send to editor
  if (page.status === 'active') {
    redirect(`/editor/${siteId}/${pageId}`);
  }

  return <CurationShell initialPage={page} token={token} siteId={siteId} />;
}
