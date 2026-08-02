// LOCAL-only: import a ZIP of a built website as a new Castor site.
//
// Unpacking and hashing tens of megabytes is not serverless work, and the admin
// surface is disabled in production anyway — requireAdminApi() enforces both.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { importZip } from "@/lib/import/importSite";
import { UnpackError } from "@/lib/import/unpack";
import { PRESETS } from "@/lib/guardian/policy";
import { assessPassword } from "@/lib/security/passwords";
import { MIN_PASSWORD_LENGTH, RESERVED_SLUGS } from "@/lib/sites/service";
import { getRepository } from "@/lib/storage/repository";

/** Long enough for a big archive; this only ever runs locally. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const slug = String(form?.get("slug") ?? "").trim().toLowerCase();
  const name = String(form?.get("name") ?? "").trim();
  const password = String(form?.get("password") ?? "");
  const presetId = String(form?.get("preset") ?? "content");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, reason: "Choose a ZIP file." }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || RESERVED_SLUGS.has(slug)) {
    return Response.json(
      { ok: false, reason: "Slug must be lowercase letters, numbers and dashes, and not reserved." },
      { status: 400 },
    );
  }
  const strength = assessPassword(password, MIN_PASSWORD_LENGTH);
  if (!strength.ok) return Response.json({ ok: false, reason: strength.reason }, { status: 400 });

  if (await (await getRepository()).getSite(slug)) {
    return Response.json({ ok: false, reason: `"${slug}" already exists.` }, { status: 409 });
  }

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!;

  try {
    const result = await importZip({
      slug,
      name: name || slug,
      password,
      zip: new Uint8Array(await file.arrayBuffer()),
      permissions: preset.permissions,
    });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    // An UnpackError is the user's archive being wrong, and its message is
    // written for them. Anything else is ours and shouldn't leak internals.
    if (err instanceof UnpackError) {
      return Response.json({ ok: false, reason: err.message }, { status: 400 });
    }
    console.error("import failed", err);
    return Response.json({ ok: false, reason: "Import failed. See the server log." }, { status: 500 });
  }
}
