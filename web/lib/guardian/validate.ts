// The Guardian: a deterministic, AI-free validator.
// Every proposed slot change passes through here before it can touch the draft.
// validate(change, policy) -> allow (with a sanitized value) | reject (with a reason).

import type { ImageValue, LinkValue, Permissions, Slot } from "../model/types";
import { canEditSlotType, capabilityFor, isPaletteColor, isScaleSpacing } from "./policy";

export type ValidateResult =
  | { ok: true; value: Slot["value"] }
  | { ok: false; reason: string };

/** Human wording for a refusal, so the client sees why rather than "denied". */
const REFUSALS: Record<string, string> = {
  text: "You can't edit the wording on this site.",
  images: "You can't change images on this site.",
  links: "You can't change links or buttons on this site.",
  textColor: "You can't change text colours on this site.",
  sectionColors: "You can't change section colours on this site.",
  spacing: "You can't change spacing on this site.",
};

/** A colour that a CSS engine will accept: hex, or a bare keyword like "white". */
function isColorSyntax(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^[a-zA-Z]+$/.test(value);
}

/**
 * Validate a colour on its own — used for both `color` slots and the optional
 * colour carried by a text slot, so the two can never disagree.
 */
export function validateColor(
  value: unknown,
  perms: Permissions,
  capability: "textColor" | "sectionColors",
): ValidateResult {
  if (!perms[capability]) return { ok: false, reason: REFUSALS[capability]! };
  const colour = String(value ?? "").trim();
  if (!isColorSyntax(colour)) return { ok: false, reason: "Not a valid colour." };
  if (perms.colorRange === "palette" && !isPaletteColor(colour)) {
    return { ok: false, reason: "Pick one of the site's colours." };
  }
  return { ok: true, value: colour };
}

/** Strip all HTML tags, collapse whitespace — for plain-text slots. */
function toPlainText(input: unknown): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Allow http(s), mailto, tel, and site-relative hrefs. Reject javascript: etc. */
function sanitizeHref(input: unknown): string | null {
  const href = String(input ?? "").trim();
  if (href === "") return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return null;
}

/** Allow http(s) and root-relative image sources. */
function sanitizeImageSrc(input: unknown): string | null {
  const src = String(input ?? "").trim();
  if (src === "") return null;
  if (src.startsWith("/")) return src;
  if (/^https?:\/\//i.test(src)) return src;
  return null;
}

const MAX_TEXT = 5000;

/**
 * Validate a proposed new value for an existing slot under a tier.
 * Does not mutate anything — returns a fresh sanitized value on success.
 */
export function validate(
  slot: Slot,
  proposedValue: unknown,
  perms: Permissions,
): ValidateResult {
  if (!canEditSlotType(perms, slot.type, slot.label)) {
    const cap = capabilityFor(slot);
    return {
      ok: false,
      reason: (cap && REFUSALS[cap]) || "You can't edit this on this site.",
    };
  }

  switch (slot.type) {
    case "text":
    case "richtext": {
      // M1: treat richtext as plain text (safe). Rich formatting comes later.
      const value = toPlainText(proposedValue);
      if (value.length > MAX_TEXT) {
        return { ok: false, reason: "Text is too long." };
      }
      return { ok: true, value };
    }

    case "color": {
      // capabilityFor already decided whether this slot colours text or a
      // whole section; reuse that so the two paths can't drift apart.
      const cap = capabilityFor(slot) === "textColor" ? "textColor" : "sectionColors";
      return validateColor(proposedValue, perms, cap);
    }

    case "space": {
      const value = String(proposedValue ?? "").trim();
      if (!/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) {
        return { ok: false, reason: "Not a valid spacing value." };
      }
      if (perms.spacingRange === "scale" && !isScaleSpacing(value)) {
        return { ok: false, reason: "Pick a spacing from the preset scale." };
      }
      return { ok: true, value };
    }

    case "image": {
      const v = (proposedValue ?? {}) as Partial<ImageValue>;
      const src = sanitizeImageSrc(v.src);
      if (src === null) {
        return { ok: false, reason: "Image URL must be http(s) or site-relative." };
      }
      const value: ImageValue = { src, alt: toPlainText(v.alt) };
      // Optional display width: a valid CSS length (px/rem/em/%) or unset.
      if (v.width) {
        const width = String(v.width).trim();
        if (!/^\d+(\.\d+)?(px|rem|em|%)$/.test(width)) {
          return { ok: false, reason: "Invalid image width." };
        }
        value.width = width;
      }
      return { ok: true, value };
    }

    case "link":
    case "button": {
      const v = (proposedValue ?? {}) as Partial<LinkValue>;
      const href = sanitizeHref(v.href);
      if (href === null) {
        return { ok: false, reason: "Link points to a disallowed URL scheme." };
      }
      const text = toPlainText(v.text);
      if (text === "") {
        return { ok: false, reason: "Link text cannot be empty." };
      }
      const value: LinkValue = { text, href };
      return { ok: true, value };
    }

    case "list": {
      if (!Array.isArray(proposedValue)) {
        return { ok: false, reason: "List value must be an array." };
      }
      const value = proposedValue.map(toPlainText).filter((s) => s !== "");
      return { ok: true, value };
    }

    default: {
      return { ok: false, reason: "Unknown slot type." };
    }
  }
}
