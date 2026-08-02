// Serves an imported site's assets from the content-addressed store.
//
// Public: these are images, stylesheets and scripts of a published site. The
// URL *is* the sha256 of the bytes, so the response can be cached forever —
// changing a file changes its URL.

import { getRepository } from "@/lib/storage/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ sha: string }> }) {
  const { sha } = await params;
  // The path segment reaches storage, so constrain it to what a hash can be.
  if (!/^[a-f0-9]{64}$/.test(sha)) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await (await getRepository()).getAsset(sha);
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(asset.bytes as unknown as BodyInit, {
    headers: {
      "content-type": asset.contentType,
      "content-length": String(asset.size),
      "cache-control": "public, max-age=31536000, immutable",
      // These are third-party files from an imported archive: never let a
      // browser second-guess the declared type.
      "x-content-type-options": "nosniff",
    },
  });
}
