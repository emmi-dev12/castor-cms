// The Guardian's policy layer: turning a site's Permissions into answers about
// one specific slot.
//
// There are no tiers. The owner ticks individual capabilities per site, and may
// override any of them per page. The presets below are only a convenience for
// the admin UI — they set the switches and are never stored as a "tier".

import type { Capability, Permissions, Slot, SlotType } from "../model/types";

/** Everything off — the safest possible starting point. */
export const NO_PERMISSIONS: Permissions = {
  text: false,
  images: false,
  links: false,
  textColor: false,
  sectionColors: false,
  spacing: false,
  colorRange: "palette",
  spacingRange: "scale",
};

/** Everything allowed, no range limits — what the owner edits at. */
export const ALL_PERMISSIONS: Permissions = {
  text: true,
  images: true,
  links: true,
  textColor: true,
  sectionColors: true,
  spacing: true,
  colorRange: "any",
  spacingRange: "any",
};

/** Sensible default for a new site: content only, nothing visual. */
export const DEFAULT_PERMISSIONS: Permissions = {
  ...NO_PERMISSIONS,
  text: true,
  images: true,
  links: true,
};

/** One-click starting points offered in the admin UI. */
export const PRESETS: { id: string; label: string; hint: string; permissions: Permissions }[] = [
  {
    id: "content",
    label: "Content only",
    hint: "Words, pictures and links. Nothing visual.",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    id: "content-brand",
    label: "Content + brand colours",
    hint: "Also colours and spacing, kept to your palette and scale.",
    permissions: {
      text: true,
      images: true,
      links: true,
      textColor: true,
      sectionColors: true,
      spacing: true,
      colorRange: "palette",
      spacingRange: "scale",
    },
  },
  {
    id: "everything",
    label: "Everything",
    hint: "Any colour, any spacing. For clients you trust.",
    permissions: ALL_PERMISSIONS,
  },
];

/** Labels for the admin checkboxes, in display order. */
export const CAPABILITY_LABELS: { id: Capability; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Headings, body copy and list items" },
  { id: "images", label: "Images", hint: "Swap pictures, alt text and size" },
  { id: "links", label: "Links and buttons", hint: "Where they point and what they say" },
  { id: "textColor", label: "Text colour", hint: "Colour each piece of text individually" },
  { id: "sectionColors", label: "Section colours", hint: "Backgrounds and accents" },
  { id: "spacing", label: "Spacing", hint: "Padding around sections" },
];

/**
 * Fill in anything missing. Sites are written with a complete Permissions
 * object, but a hand-edited document (or one written by an older build) might
 * not be — treating an absent switch as `false` fails closed rather than open.
 */
export function resolvePermissions(
  site: Partial<Permissions> | undefined,
  pageOverride?: Partial<Permissions>,
): Permissions {
  return { ...NO_PERMISSIONS, ...(site ?? {}), ...(pageOverride ?? {}) };
}

/** Labels the section renderers use for text (as opposed to section) colours. */
export function isTextColorLabel(label: string | undefined): boolean {
  return (label ?? "").toLowerCase().replace(/[\s_-]/g, "") === "textcolor";
}

/** Which permission governs a slot. Colour slots depend on what they colour. */
export function capabilityFor(slot: Pick<Slot, "type" | "label">): Capability | null {
  switch (slot.type) {
    case "text":
    case "richtext":
    case "list":
      return "text";
    case "image":
      return "images";
    case "link":
    case "button":
      return "links";
    case "space":
      return "spacing";
    case "color":
      // A slot labelled for text colours the words; anything else (bg, accent)
      // is a section-wide colour.
      return isTextColorLabel(slot.label) ? "textColor" : "sectionColors";
    default:
      return null;
  }
}

/**
 * Which permission governs a slot's *own* colour, if it can carry one. Text
 * nodes colour their words (textColor); a button colours its background, which
 * is a design colour (sectionColors). Anything else can't carry a colour.
 */
export function colorCapabilityFor(
  slot: Pick<Slot, "type">,
): "textColor" | "sectionColors" | null {
  if (slot.type === "text" || slot.type === "richtext") return "textColor";
  if (slot.type === "link" || slot.type === "button") return "sectionColors";
  return null;
}

/** Whether a slot of this type may be edited at all under these permissions. */
export function canEditSlotType(perms: Permissions, type: SlotType, label?: string): boolean {
  const cap = capabilityFor({ type, label });
  return cap !== null && perms[cap];
}

/** Preset spacing scale offered when spacing is limited to the scale. */
export const SPACING_SCALE: { label: string; value: string }[] = [
  { label: "None", value: "0rem" },
  { label: "S", value: "1rem" },
  { label: "M", value: "2rem" },
  { label: "L", value: "4rem" },
  { label: "XL", value: "6rem" },
];

export function isScaleSpacing(value: string): boolean {
  return SPACING_SCALE.some((s) => s.value === value.trim());
}

/** The owner's on-brand swatches, offered when colours are limited to a palette. */
export const ALLOWED_PALETTE: string[] = [
  "#0f172a", // slate-900 (default dark)
  "#334155", // slate-700
  "#1e40af", // blue-800
  "#047857", // emerald-700
  "#b91c1c", // red-700
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#f59e0b", // amber-500
  "#ffffff", // white
];

export function isPaletteColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return ALLOWED_PALETTE.some((c) => c.toLowerCase() === v);
}
