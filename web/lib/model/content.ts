// Helpers for reading/mutating the content model.

import type { Page, Section, Site, SiteContent, Slot, Version } from "./types";

/** Deep clone via structured JSON (content is always JSON-serializable). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Find a slot anywhere in a site's content, with the section that holds it. */
export function findSlot(
  content: SiteContent,
  slotId: string,
): { page: Page; section: Section; slot: Slot } | null {
  for (const page of content.pages) {
    for (const section of page.sections) {
      for (const slot of section.slots) {
        if (slot.id === slotId) return { page, section, slot };
      }
    }
  }
  return null;
}

/** Return the content that should be shown publicly (the published version). */
export function publishedContent(site: Site): SiteContent | null {
  if (!site.publishedVersionId) return null;
  const v = site.versions.find((x) => x.id === site.publishedVersionId);
  return v ? v.content : null;
}

/** Get a page from content by path ("" / "home" is the index). */
export function getPage(content: SiteContent, path: string): Page | null {
  const norm = (p: string) => (p === "" || p === "home" ? "" : p.replace(/^\/+/, ""));
  const target = norm(path);
  return content.pages.find((p) => norm(p.path) === target) ?? null;
}

/** Build an immutable version snapshot from the current draft. */
export function snapshotVersion(
  content: SiteContent,
  idFactory: () => string,
  label?: string,
): Version {
  return {
    id: idFactory(),
    createdAt: new Date().toISOString(),
    label,
    content: clone(content),
  };
}
