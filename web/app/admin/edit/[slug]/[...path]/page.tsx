// Owner master editor for any non-home page, at /admin/edit/[slug]/[...path].

import { AdminEditSitePage } from "@/components/pages/AdminEditSitePage";

export default async function AdminEditSub({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>;
}) {
  const { slug, path } = await params;
  return <AdminEditSitePage slug={slug} path={path.join("/")} />;
}
