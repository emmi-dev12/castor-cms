// Core content model for the AI-Native CMS.
// Site -> Pages -> Sections -> Slots. See the approved plan for the design.

/**
 * What a client is allowed to change. The owner ticks these per site (and may
 * override them per page) — there are no fixed tiers, so any combination is
 * expressible: "text and images only", "everything except spacing", and so on.
 */
export interface Permissions {
  /** Text, headings, and list items. */
  text: boolean;
  /** Image source, alt text, and display width. */
  images: boolean;
  /** Link and button targets and labels. */
  links: boolean;
  /** The colour of an individual piece of text. */
  textColor: boolean;
  /** Section-wide colours: backgrounds and accents. */
  sectionColors: boolean;
  /** Section padding. */
  spacing: boolean;
  /**
   * How far the colour permissions reach. "palette" keeps the client on the
   * owner's swatches; "any" opens the full picker. Irrelevant when both colour
   * permissions are off.
   */
  colorRange: "palette" | "any";
  /** As above, for spacing: the preset scale, or any CSS length. */
  spacingRange: "scale" | "any";
}

/** One switch in `Permissions` — the boolean capabilities only. */
export type Capability = "text" | "images" | "links" | "textColor" | "sectionColors" | "spacing";

/** The kinds of editable values a slot can hold. */
export type SlotType =
  | "text"
  | "richtext"
  | "image"
  | "link"
  | "button"
  | "color"
  | "space"
  | "list";

export interface ImageValue {
  src: string;
  alt: string;
  /** Optional display width (CSS length, e.g. "60%" or "480px"). */
  width?: string;
}

export interface LinkValue {
  text: string;
  href: string;
}

/** A single editable unit. `value` shape depends on `type`. */
export type Slot =
  /** Text carries its own optional colour, so two headings in one section can
   *  differ. Unset means "inherit" — the section's colour, or the theme's. */
  | { id: string; type: "text" | "richtext"; label?: string; value: string; color?: string }
  | { id: string; type: "color" | "space"; label?: string; value: string }
  | { id: string; type: "image"; label?: string; value: ImageValue }
  | { id: string; type: "link" | "button"; label?: string; value: LinkValue }
  | { id: string; type: "list"; label?: string; value: string[] };

/**
 * A section of a page. `type` selects a renderer.
 * - Typed sections (hero, text, cta, footer, ...) are the AI-built path (M1).
 * - `raw-html` sections carry a `template` with {{slotId}} placeholders and are
 *   the clone path (M4). Included here so the model is forward-compatible.
 */
export interface Section {
  id: string;
  type: string;
  slots: Slot[];
  /** Only for `raw-html` sections (cloned sites): the frozen body HTML,
   *  with editable elements carrying data-slot-id attributes. */
  template?: string;
  /** Only for `raw-html` sections: captured <head> markup (styles/links). */
  head?: string;
}

export interface Page {
  id: string;
  /** Path within the site. "" (or "home") is the index page. */
  path: string;
  title: string;
  /** Optional per-page override of the site's permissions. Only the keys
   *  present are overridden; the rest fall through to the site's. */
  permissions?: Partial<Permissions>;
  sections: Section[];
}

/** The full editable content of a site (all pages). */
export interface SiteContent {
  pages: Page[];
}

/** An immutable published snapshot. */
export interface Version {
  id: string;
  createdAt: string;
  label?: string;
  content: SiteContent;
}

/** A single submission from a published site's form section. */
export interface Submission {
  id: string;
  siteSlug: string;
  /** Which form section it came from (a site can have several). */
  sectionId: string;
  createdAt: string;
  /** Field label -> submitted value. */
  fields: Record<string, string>;
}

export interface Site {
  /** Unique, URL-facing identifier: castorcms.vercel.app/[slug]. */
  slug: string;
  name: string;
  passwordHash: string;
  /** What this site's client may change. */
  permissions: Permissions;
  /**
   * Optimistic-locking revision. Every successful `updateSite` requires the
   * caller's `rev` to still match what's stored, then bumps it. Without this a
   * read-modify-write from the admin editor would silently clobber a
   * simultaneous client edit (the whole site doc is replaced on write).
   * Legacy sites written before this existed have no `rev`; treat it as 0.
   */
  rev?: number;
  /** Current working copy the client edits. */
  draft: SiteContent;
  /** Immutable published snapshots, oldest first. */
  versions: Version[];
  /** Points at the live version rendered to the public. null = never published. */
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A proposed edit to a single slot's value. */
export interface SlotChange {
  slotId: string;
  value: unknown;
}
