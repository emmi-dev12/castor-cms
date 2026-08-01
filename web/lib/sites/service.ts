// Domain operations: edit (through the Guardian), publish, rollback, auth, seed.
// Server-only.

import bcrypt from "bcryptjs";
import { DEFAULT_PERMISSIONS, resolvePermissions } from "../guardian/policy";
import { validate, validateColor } from "../guardian/validate";
import { clone, findSlot, newId, snapshotVersion } from "../model/content";
import type { Permissions, Site, SiteContent, Slot, Submission } from "../model/types";
import { assessPassword } from "../security/passwords";
import { getRepository } from "../storage/repository";

/** Surfaced when a concurrent edit changed the site since we read it. */
export const CONFLICT =
  "Someone else changed this site while you were editing — reloading the latest version.";

export type EditResult =
  | { ok: true; value: Slot["value"] }
  | { ok: false; reason: string };

/** Apply a single slot change to a site's draft, gated by the Guardian. */
export async function applyEdit(
  slug: string,
  slotId: string,
  proposedValue: unknown,
  /** Optional colour for a text slot, governed by the `textColor` permission.
   *  `null` clears it, so the text goes back to inheriting. */
  proposedColor?: string | null,
): Promise<EditResult> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return { ok: false, reason: "Site not found." };

  const found = findSlot(site.draft, slotId);
  if (!found) return { ok: false, reason: "No such editable slot." };

  // Per-page overrides win over the site's own switches, key by key.
  const perms = resolvePermissions(site.permissions, found.page.permissions);
  const slot = found.slot as Slot;

  // A colour change is a separate permission from the words it colours, so an
  // edit carrying both has to clear both gates before either is written.
  let colour: string | null | undefined;
  if (proposedColor !== undefined) {
    if (slot.type !== "text" && slot.type !== "richtext") {
      return { ok: false, reason: "Only text can carry its own colour." };
    }
    if (proposedColor === null) {
      if (!perms.textColor) return { ok: false, reason: "You can't change text colours." };
      colour = null;
    } else {
      const checked = validateColor(proposedColor, perms, "textColor");
      if (!checked.ok) return checked;
      colour = checked.value as string;
    }
  }

  const result = validate(slot, proposedValue, perms);
  if (!result.ok) return result;

  // Mutate the located slot in place (findSlot returned live references).
  slot.value = result.value as never;
  if (colour !== undefined && (slot.type === "text" || slot.type === "richtext")) {
    if (colour === null) delete slot.color;
    else slot.color = colour;
  }
  site.updatedAt = new Date().toISOString();
  if (!(await repo.updateSite(site))) return { ok: false, reason: CONFLICT };

  return { ok: true, value: result.value };
}

/** Snapshot the draft into an immutable version and make it live. */
export async function publish(slug: string, label?: string): Promise<boolean> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return false;

  const version = snapshotVersion(site.draft, () => newId("ver"), label);
  site.versions.push(version);
  site.publishedVersionId = version.id;
  site.updatedAt = new Date().toISOString();
  return repo.updateSite(site);
}

/** Point the live pointer at an existing version (one-click rollback). */
export async function rollback(slug: string, versionId: string): Promise<boolean> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return false;
  if (!site.versions.some((v) => v.id === versionId)) return false;

  site.publishedVersionId = versionId;
  site.updatedAt = new Date().toISOString();
  return repo.updateSite(site);
}

/** Owner-only: set what this site's client is allowed to change. */
export async function setPermissions(
  slug: string,
  permissions: Permissions,
): Promise<boolean> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return false;
  // Normalise, so a partial payload can never leave a switch undefined.
  site.permissions = resolvePermissions(permissions);
  site.updatedAt = new Date().toISOString();
  return repo.updateSite(site);
}

/** Owner-only: read a site's form submissions (newest first). */
export async function listSubmissions(slug: string): Promise<Submission[]> {
  const all = await (await getRepository()).listSubmissions(slug);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSubmission(slug: string, id: string): Promise<void> {
  await (await getRepository()).deleteSubmission(slug, id);
}

/** Minimum length for any newly-set password. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Client self-service password change. Requires the current password even
 * though the caller already holds a session — otherwise anyone who walked up to
 * an unattended logged-in browser could lock the real client out of their site.
 */
export async function changePassword(
  slug: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const strength = assessPassword(newPassword, MIN_PASSWORD_LENGTH);
  if (!strength.ok) return { ok: false, reason: strength.reason! };
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return { ok: false, reason: "Site not found." };

  if (!(await bcrypt.compare(currentPassword, site.passwordHash))) {
    return { ok: false, reason: "Current password is incorrect." };
  }
  if (await bcrypt.compare(newPassword, site.passwordHash)) {
    return { ok: false, reason: "That's already your password — pick a new one." };
  }

  site.passwordHash = await bcrypt.hash(newPassword, 10);
  site.updatedAt = new Date().toISOString();
  if (!(await repo.updateSite(site))) return { ok: false, reason: CONFLICT };
  return { ok: true };
}

/** Verify a site-scoped client password. */
export async function verifyPassword(slug: string, password: string): Promise<boolean> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return false;
  return bcrypt.compare(password, site.passwordHash);
}

export interface CreateSiteInput {
  slug: string;
  name: string;
  password: string;
  permissions?: Permissions;
  draft: SiteContent;
}

/**
 * Slugs that would collide with a top-level app route and so can't name a site:
 * "" (the admin/home route), "edit" (the whole editor surface lives at
 * /edit/[slug]), "admin", and "api". Everything else is fair game — content
 * page *paths* (e.g. a page literally named "edit") are unaffected because the
 * editor is not nested under /[slug].
 */
export const RESERVED_SLUGS = new Set(["", "edit", "admin", "api"]);

/** Create (or overwrite) a site. Used by the local admin seed. */
export async function createSite(input: CreateSiteInput): Promise<Site> {
  if (RESERVED_SLUGS.has(input.slug)) {
    throw new Error(`"${input.slug}" is a reserved slug and can't name a site.`);
  }
  const repo = await getRepository();
  const now = new Date().toISOString();
  const site: Site = {
    slug: input.slug,
    name: input.name,
    passwordHash: await bcrypt.hash(input.password, 10),
    permissions: resolvePermissions(input.permissions ?? DEFAULT_PERMISSIONS),
    draft: clone(input.draft),
    versions: [],
    publishedVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putSite(site);
  return site;
}

/** URL-safe slug (lowercase letters, digits, dashes). */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CloneSiteInput {
  url: string;
  slug: string;
  name?: string;
  password: string;
  permissions?: Permissions;
}

/**
 * Clone an existing page (Playwright snapshot) into a new site as a single
 * `raw-html` section with tagged text/image slots. LOCAL admin only.
 */
export async function createSiteFromClone(
  input: CloneSiteInput,
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, reason: "Invalid slug." };
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: `"${slug}" is a reserved word and can't be a site slug.` };
  }

  const repo = await getRepository();
  if (await repo.getSite(slug)) {
    return { ok: false, reason: `A site with slug "${slug}" already exists.` };
  }

  // Dynamic import keeps Playwright out of the module graph until used.
  const { snapshot } = await import("../ingest/snapshot");
  let snap;
  try {
    snap = await snapshot(input.url);
  } catch (err) {
    return { ok: false, reason: `Ingest failed: ${(err as Error).message}` };
  }

  const draft: SiteContent = {
    pages: [
      {
        id: newId("page"),
        path: "",
        title: snap.title || input.name || slug,
        sections: [
          {
            id: newId("sec"),
            type: "raw-html",
            template: snap.body,
            head: snap.head,
            slots: snap.slots,
          },
        ],
      },
    ],
  };

  await createSite({
    slug,
    name: input.name || snap.title || slug,
    password: input.password,
    permissions: resolvePermissions(input.permissions ?? DEFAULT_PERMISSIONS),
    draft,
  });
  return { ok: true, slug };
}
