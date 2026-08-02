// Storage abstraction. Local dev uses the filesystem (no Atlas needed);
// when MONGODB_URI is set (e.g. on Vercel) it uses MongoDB Atlas.
// Server-only — never import from a client component.

import type { Asset, Site, Submission } from "../model/types";

export interface Repository {
  getSite(slug: string): Promise<Site | null>;
  /** Unconditional write — use for creating/overwriting a whole site. */
  putSite(site: Site): Promise<void>;
  /**
   * Compare-and-swap write for read-modify-write flows. Succeeds only if the
   * stored revision still matches `site.rev` (so a concurrent edit can't be
   * silently clobbered), bumping the revision. Returns false on conflict —
   * callers should re-read and surface that to the user rather than retrying
   * blindly, since the underlying content has changed.
   */
  updateSite(site: Site): Promise<boolean>;
  listSites(): Promise<Site[]>;
  deleteSite(slug: string): Promise<void>;
  /** Form submissions from published sites. */
  addSubmission(submission: Submission): Promise<void>;
  listSubmissions(slug: string): Promise<Submission[]>;
  deleteSubmission(slug: string, id: string): Promise<void>;

  /**
   * Fixed-window counter for rate limiting. Records one hit against `key` and
   * returns the running count for the current window. Must be storage-backed
   * (not in-memory) because production runs on serverless instances that don't
   * share memory — an in-process counter would reset constantly and let a
   * brute-force through.
   */
  bumpRate(key: string, windowMs: number): Promise<number>;
  /** Reset a counter — e.g. after a successful login. */
  clearRate(key: string): Promise<void>;

  /**
   * Small key/value store for owner-level settings that aren't tied to a site
   * (currently just the admin password hash, once it's been changed from the
   * one bootstrapped by ADMIN_PASSWORD).
   */
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  /**
   * Content-addressed binary store for imported site assets (images, CSS, JS).
   * Keyed by the sha256 of the bytes, so a logo repeated across ten pages is
   * stored once and its URL can be cached forever.
   */
  putAsset(asset: Asset): Promise<void>;
  getAsset(sha: string): Promise<Asset | null>;
  /** Every asset belonging to a site, so deleting a site can reclaim them. */
  listAssetShas(siteSlug: string): Promise<string[]>;
  deleteAssets(siteSlug: string): Promise<void>;
}

let cached: Repository | null = null;

/** Returns the active repository, chosen by environment. */
export async function getRepository(): Promise<Repository> {
  if (cached) return cached;
  if (process.env.MONGODB_URI) {
    const { MongoRepository } = await import("./mongoRepo");
    cached = new MongoRepository(process.env.MONGODB_URI);
  } else {
    const { FileRepository } = await import("./fileRepo");
    cached = new FileRepository();
  }
  return cached;
}
