// Owner master editor for a site's home page, at /admin/edit/[slug]. Local-only.

import { AdminEditSitePage } from "@/components/pages/AdminEditSitePage";

export default async function AdminEditHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminEditSitePage slug={slug} path="" />;
}
