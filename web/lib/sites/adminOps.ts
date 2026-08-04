// Owner-only ("admin") operations: full control over a site's structure and
// content, bypassing the client's permission tier. Local admin only — the API
// routes that call these are gated by isAdminEnabled(). Every op mutates the
// site's draft and persists; Publish still snapshots the draft as usual.

import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS, colorCapabilityFor } from "../guardian/policy";
import { validate, validateColor } from "../guardian/validate";
import { clone, findSlot, newId } from "../model/content";
import { templateSection } from "../model/sectionTemplates";
import type { Page, Section, Site, Slot } from "../model/types";
import { assessPassword } from "../security/passwords";
import { getRepository } from "../storage/repository";
import { CONFLICT, MIN_PASSWORD_LENGTH } from "./service";

type Ok = { ok: true };
type Err = { ok: false; reason: string };
type Result = Ok | Err;

async function withSite(slug: string, fn: (site: Site) => Result | Promise<Result>): Promise<Result> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return { ok: false, reason: "Site not found." };
  const result = await fn(site);
  if (result.ok) {
    site.updatedAt = new Date().toISOString();
    // CAS write: if a client edit landed since we read, don't clobber it.
    if (!(await repo.updateSite(site))) return { ok: false, reason: CONFLICT };
  }
  return result;
}

/** Locate a section by id anywhere in the draft, with its page and index. */
function locateSection(site: Site, sectionId: string): { page: Page; index: number } | null {
  for (const page of site.draft.pages) {
    const index = page.sections.findIndex((s) => s.id === sectionId);
    if (index >= 0) return { page, index };
  }
  return null;
}

function findPage(site: Site, path: string): Page | undefined {
  const norm = (p: string) => (p === "home" ? "" : p.replace(/^\/+/, ""));
  return site.draft.pages.find((p) => norm(p.path) === norm(path));
}

/** Clone a section (or any node) with brand-new ids so it can coexist. */
function freshIds(section: Section): Section {
  const copy = clone(section);
  copy.id = newId("sec");
  copy.slots = copy.slots.map((s) => ({ ...s, id: newId("s") }) as Slot);
  return copy;
}

/** Edit any slot with every permission granted — the owner is not limited by
 *  what the client is allowed to change. */
export async function adminApplyEdit(
  slug: string,
  slotId: string,
  proposedValue: unknown,
  proposedColor?: string | null,
): Promise<{ ok: true; value: Slot["value"] } | Err> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return { ok: false, reason: "Site not found." };
  const found = findSlot(site.draft, slotId);
  if (!found) return { ok: false, reason: "No such slot." };
  // Still runs through the Guardian for sanitization/shape — just unrestricted.
  const slot = found.slot as Slot;
  const result = validate(slot, proposedValue, ALL_PERMISSIONS);
  if (!result.ok) return result;
  slot.value = result.value as never;
  const colourCap = colorCapabilityFor(slot);
  if (proposedColor !== undefined && colourCap) {
    const coloured = slot as { color?: string };
    const checked = proposedColor === null ? null : validateColor(proposedColor, ALL_PERMISSIONS, colourCap);
    if (checked && !checked.ok) return checked;
    if (checked === null) delete coloured.color;
    else coloured.color = checked.value as string;
  }
  site.updatedAt = new Date().toISOString();
  if (!(await repo.updateSite(site))) return { ok: false, reason: CONFLICT };
  return { ok: true, value: result.value };
}

export function moveSection(slug: string, sectionId: string, dir: "up" | "down") {
  return withSite(slug, (site) => {
    const loc = locateSection(site, sectionId);
    if (!loc) return { ok: false, reason: "Section not found." };
    const { page, index } = loc;
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= page.sections.length) return { ok: true }; // no-op at edges
    const [moved] = page.sections.splice(index, 1);
    page.sections.splice(target, 0, moved);
    return { ok: true };
  });
}

export function deleteSection(slug: string, sectionId: string) {
  return withSite(slug, (site) => {
    const loc = locateSection(site, sectionId);
    if (!loc) return { ok: false, reason: "Section not found." };
    loc.page.sections.splice(loc.index, 1);
    return { ok: true };
  });
}

export function duplicateSection(slug: string, sectionId: string) {
  return withSite(slug, (site) => {
    const loc = locateSection(site, sectionId);
    if (!loc) return { ok: false, reason: "Section not found." };
    const copy = freshIds(loc.page.sections[loc.index]);
    loc.page.sections.splice(loc.index + 1, 0, copy);
    return { ok: true };
  });
}

export function addSection(slug: string, pagePath: string, type: string, afterSectionId?: string) {
  return withSite(slug, (site) => {
    const page = findPage(site, pagePath);
    if (!page) return { ok: false, reason: "Page not found." };
    const section = templateSection(type);
    const at = afterSectionId
      ? page.sections.findIndex((s) => s.id === afterSectionId) + 1
      : page.sections.length;
    page.sections.splice(at, 0, section);
    return { ok: true };
  });
}

export function addPage(slug: string, path: string, title: string) {
  return withSite(slug, (site) => {
    const clean = path.trim().replace(/^\/+|\/+$/g, "");
    if (["", "edit", "admin", "api"].includes(clean)) {
      return { ok: false, reason: `"${clean || "(home)"}" can't be added as a page path.` };
    }
    if (site.draft.pages.some((p) => p.path === clean)) {
      return { ok: false, reason: "A page with that path already exists." };
    }
    site.draft.pages.push({
      id: newId("page"),
      path: clean,
      title: title.trim() || clean,
      sections: [templateSection("hero")],
    });
    return { ok: true };
  });
}

export function deletePage(slug: string, path: string) {
  return withSite(slug, (site) => {
    if (path === "" || path === "home") return { ok: false, reason: "Can't delete the home page." };
    const before = site.draft.pages.length;
    site.draft.pages = site.draft.pages.filter((p) => p.path !== path);
    if (site.draft.pages.length === before) return { ok: false, reason: "Page not found." };
    return { ok: true };
  });
}

export function renamePage(slug: string, path: string, title: string) {
  return withSite(slug, (site) => {
    const page = findPage(site, path);
    if (!page) return { ok: false, reason: "Page not found." };
    page.title = title.trim() || page.title;
    return { ok: true };
  });
}

export async function setPassword(slug: string, password: string): Promise<Result> {
  const strength = assessPassword(password ?? "", MIN_PASSWORD_LENGTH);
  if (!strength.ok) return { ok: false, reason: strength.reason! };
  return withSite(slug, async (site) => {
    site.passwordHash = await bcrypt.hash(password, 10);
    return { ok: true };
  });
}

export async function deleteSite(slug: string): Promise<Result> {
  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) return { ok: false, reason: "Site not found." };
  await repo.deleteSite(slug);
  return { ok: true };
}
