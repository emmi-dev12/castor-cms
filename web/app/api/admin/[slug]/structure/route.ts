// LOCAL-only structural editing: move / duplicate / delete sections, add a
// section from a template, and add / delete / rename pages. Disabled in prod.

import { requireAdminApi } from "@/lib/auth/adminSession";
import {
  addPage,
  addSection,
  deletePage,
  deleteSection,
  duplicateSection,
  moveSection,
  renamePage,
} from "@/lib/sites/adminOps";

type Body = {
  op?: string;
  sectionId?: string;
  dir?: "up" | "down";
  pagePath?: string;
  type?: string;
  afterSectionId?: string;
  path?: string;
  title?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const b = (await request.json().catch(() => ({}))) as Body;

  const run = async () => {
    switch (b.op) {
      case "move-section":
        return moveSection(slug, b.sectionId!, b.dir ?? "up");
      case "duplicate-section":
        return duplicateSection(slug, b.sectionId!);
      case "delete-section":
        return deleteSection(slug, b.sectionId!);
      case "add-section":
        return addSection(slug, b.pagePath ?? "", b.type ?? "text", b.afterSectionId);
      case "add-page":
        return addPage(slug, b.path ?? "", b.title ?? "");
      case "delete-page":
        return deletePage(slug, b.path ?? "");
      case "rename-page":
        return renamePage(slug, b.path ?? "", b.title ?? "");
      default:
        return { ok: false as const, reason: `Unknown op "${b.op}".` };
    }
  };

  const result = await run();
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
