// Unit tests for the Guardian — the safety-critical piece that decides what a
// client is allowed to change. A silent regression here means a client can
// wreck a design the owner meant to protect, so every permission is covered
// explicitly, including the combinations that used not to be expressible.
//
// Run: npm test

import assert from "node:assert/strict";
import { test } from "node:test";
import type { ImageValue, LinkValue, Permissions, Slot } from "../model/types";
import {
  ALL_PERMISSIONS,
  ALLOWED_PALETTE,
  DEFAULT_PERMISSIONS,
  NO_PERMISSIONS,
  SPACING_SCALE,
  capabilityFor,
  colorCapabilityFor,
  resolvePermissions,
} from "./policy";
import { validate, validateColor } from "./validate";

/** Start from nothing and switch on exactly what a case is about. */
function perms(overrides: Partial<Permissions> = {}): Permissions {
  return { ...NO_PERMISSIONS, ...overrides };
}

const textSlot: Slot = { id: "s1", type: "text", label: "headline", value: "Hello" };
const richSlot: Slot = { id: "s2", type: "richtext", label: "body", value: "Body" };
const accentSlot: Slot = { id: "s3", type: "color", label: "accent", value: "#0f172a" };
const textColorSlot: Slot = { id: "s3b", type: "color", label: "textColor", value: "#0f172a" };
const spaceSlot: Slot = { id: "s4", type: "space", label: "padding", value: "2rem" };
const imageSlot: Slot = {
  id: "s5",
  type: "image",
  label: "image",
  value: { src: "https://example.com/a.jpg", alt: "a" },
};
const linkSlot: Slot = {
  id: "s6",
  type: "link",
  label: "cta",
  value: { text: "Go", href: "https://example.com" },
};
const listSlot: Slot = { id: "s7", type: "list", label: "items", value: ["a", "b"] };

// ── Each switch gates only its own slots ─────────────────────────────────────
// The point of dropping tiers: any combination is expressible, and one
// permission never implies another.

test("text permission allows text and refuses everything else", () => {
  const p = perms({ text: true });
  assert.equal(validate(textSlot, "New headline", p).ok, true);
  assert.equal(validate(richSlot, "New body", p).ok, true);
  assert.equal(validate(listSlot, ["x"], p).ok, true);
  assert.equal(validate(imageSlot, { src: "https://e.com/b.jpg", alt: "b" }, p).ok, false);
  assert.equal(validate(linkSlot, { text: "Go", href: "https://e.com" }, p).ok, false);
  assert.equal(validate(accentSlot, "#ffffff", p).ok, false);
  assert.equal(validate(spaceSlot, "1rem", p).ok, false);
});

test("images permission does not grant text", () => {
  const p = perms({ images: true });
  assert.equal(validate(imageSlot, { src: "https://e.com/b.jpg", alt: "b" }, p).ok, true);
  assert.equal(validate(textSlot, "Nope", p).ok, false);
});

test("links permission does not grant text", () => {
  const p = perms({ links: true });
  assert.equal(validate(linkSlot, { text: "Book", href: "https://e.com" }, p).ok, true);
  assert.equal(validate(textSlot, "Nope", p).ok, false);
});

test("spacing permission does not grant colours", () => {
  const p = perms({ spacing: true, spacingRange: "any" });
  assert.equal(validate(spaceSlot, "3rem", p).ok, true);
  assert.equal(validate(accentSlot, "#ffffff", p).ok, false);
});

test("everything off refuses every slot", () => {
  const p = NO_PERMISSIONS;
  assert.equal(validate(textSlot, "x", p).ok, false);
  assert.equal(validate(imageSlot, { src: "https://e.com/b.jpg", alt: "" }, p).ok, false);
  assert.equal(validate(linkSlot, { text: "a", href: "/x" }, p).ok, false);
  assert.equal(validate(accentSlot, "#fff", p).ok, false);
  assert.equal(validate(spaceSlot, "1rem", p).ok, false);
});

// ── Text colour is separate from section colour ──────────────────────────────
// The whole reason for per-element colour: a client may be trusted to colour a
// heading without being trusted to repaint a section background.

test("a slot labelled textColor is governed by textColor, not sectionColors", () => {
  assert.equal(capabilityFor(textColorSlot), "textColor");
  assert.equal(capabilityFor(accentSlot), "sectionColors");
});

test("textColor alone allows text colour but not section colour", () => {
  const p = perms({ textColor: true, colorRange: "any" });
  assert.equal(validate(textColorSlot, "#ff0000", p).ok, true);
  assert.equal(validate(accentSlot, "#ff0000", p).ok, false);
});

test("sectionColors alone allows section colour but not text colour", () => {
  const p = perms({ sectionColors: true, colorRange: "any" });
  assert.equal(validate(accentSlot, "#ff0000", p).ok, true);
  assert.equal(validate(textColorSlot, "#ff0000", p).ok, false);
});

test("textColor label matching ignores case and separators", () => {
  assert.equal(capabilityFor({ type: "color", label: "text-color" }), "textColor");
  assert.equal(capabilityFor({ type: "color", label: "Text Color" }), "textColor");
  assert.equal(capabilityFor({ type: "color", label: "bg" }), "sectionColors");
});

// ── A button's own colour ────────────────────────────────────────────────────
// Text colours words (textColor); a button colours its background, which is a
// design colour (sectionColors). They must not be conflated.

test("colorCapabilityFor maps slots to the right colour permission", () => {
  assert.equal(colorCapabilityFor({ type: "text" }), "textColor");
  assert.equal(colorCapabilityFor({ type: "richtext" }), "textColor");
  assert.equal(colorCapabilityFor({ type: "button" }), "sectionColors");
  assert.equal(colorCapabilityFor({ type: "link" }), "sectionColors");
  assert.equal(colorCapabilityFor({ type: "image" }), null);
});

test("a button colour is gated by sectionColors, not textColor", () => {
  const p = perms({ links: true, textColor: true, colorRange: "any" });
  // textColor is on but sectionColors is off: a button colour is still refused.
  assert.equal(validateColor("#047857", p, "sectionColors").ok, false);
  const q = perms({ links: true, sectionColors: true, colorRange: "any" });
  assert.equal(validateColor("#047857", q, "sectionColors").ok, true);
});

// ── colorRange ───────────────────────────────────────────────────────────────

test("palette range accepts palette colours and refuses others", () => {
  const p = perms({ textColor: true, colorRange: "palette" });
  assert.equal(validateColor(ALLOWED_PALETTE[0]!, p, "textColor").ok, true);
  assert.equal(validateColor("#ff00ff", p, "textColor").ok, false);
});

test("any range accepts an off-palette colour", () => {
  const p = perms({ textColor: true, colorRange: "any" });
  const r = validateColor("#ff00ff", p, "textColor");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, "#ff00ff");
});

test("colour syntax is still validated when any colour is allowed", () => {
  const p = perms({ textColor: true, colorRange: "any" });
  assert.equal(validateColor("not a colour!", p, "textColor").ok, false);
  assert.equal(validateColor("javascript:alert(1)", p, "textColor").ok, false);
  assert.equal(validateColor("white", p, "textColor").ok, true);
});

test("validateColor refuses when the capability is off, whatever the range", () => {
  const p = perms({ colorRange: "any" });
  assert.equal(validateColor("#ff0000", p, "textColor").ok, false);
  assert.equal(validateColor("#ff0000", p, "sectionColors").ok, false);
});

// ── spacingRange ─────────────────────────────────────────────────────────────

test("scale range accepts the preset scale and refuses arbitrary lengths", () => {
  const p = perms({ spacing: true, spacingRange: "scale" });
  assert.equal(validate(spaceSlot, SPACING_SCALE[2]!.value, p).ok, true);
  assert.equal(validate(spaceSlot, "37px", p).ok, false);
});

test("any range accepts an off-scale length but still requires a unit", () => {
  const p = perms({ spacing: true, spacingRange: "any" });
  assert.equal(validate(spaceSlot, "37px", p).ok, true);
  assert.equal(validate(spaceSlot, "37", p).ok, false);
  assert.equal(validate(spaceSlot, "huge", p).ok, false);
});

// ── Sanitisation still applies regardless of permissions ─────────────────────

test("text is stripped of HTML", () => {
  const r = validate(textSlot, "<script>alert(1)</script>Hi", perms({ text: true }));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, "alert(1)Hi");
});

test("text length is capped", () => {
  assert.equal(validate(textSlot, "x".repeat(5001), perms({ text: true })).ok, false);
});

test("javascript: hrefs are refused even with links allowed", () => {
  const p = perms({ links: true });
  assert.equal(validate(linkSlot, { text: "x", href: "javascript:alert(1)" }, p).ok, false);
  assert.equal(validate(linkSlot, { text: "x", href: "https://ok.com" }, p).ok, true);
  assert.equal(validate(linkSlot, { text: "x", href: "/about" }, p).ok, true);
  assert.equal(validate(linkSlot, { text: "x", href: "mailto:a@b.com" }, p).ok, true);
});

test("empty link text is refused", () => {
  assert.equal(validate(linkSlot, { text: "  ", href: "/x" }, perms({ links: true })).ok, false);
});

test("image sources must be http(s) or site-relative", () => {
  const p = perms({ images: true });
  const bad: ImageValue = { src: "javascript:alert(1)", alt: "" };
  assert.equal(validate(imageSlot, bad, p).ok, false);
  assert.equal(validate(imageSlot, { src: "/local.png", alt: "" }, p).ok, true);
});

test("image width must be a valid CSS length", () => {
  const p = perms({ images: true });
  const base = { src: "https://e.com/a.jpg", alt: "" };
  assert.equal(validate(imageSlot, { ...base, width: "50%" }, p).ok, true);
  assert.equal(validate(imageSlot, { ...base, width: "wide" }, p).ok, false);
});

test("list values are stripped and empty entries dropped", () => {
  const r = validate(listSlot, ["<b>a</b>", "", "  ", "c"], perms({ text: true }));
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value, ["a", "c"]);
});

test("link values reject non-object payloads", () => {
  const r = validate(linkSlot, "just a string" as unknown as LinkValue, perms({ links: true }));
  assert.equal(r.ok, false);
});

// ── resolvePermissions ───────────────────────────────────────────────────────
// Failing closed matters: a document missing a switch must not grant it.

test("missing switches resolve to off, not on", () => {
  const r = resolvePermissions({ text: true });
  assert.equal(r.text, true);
  assert.equal(r.images, false);
  assert.equal(r.textColor, false);
  assert.equal(r.colorRange, "palette");
});

test("undefined permissions resolve to nothing allowed", () => {
  assert.deepEqual(resolvePermissions(undefined), NO_PERMISSIONS);
});

test("a page override wins over the site, key by key", () => {
  const r = resolvePermissions({ text: true, images: true }, { images: false, textColor: true });
  assert.equal(r.text, true); // untouched by the override
  assert.equal(r.images, false); // narrowed
  assert.equal(r.textColor, true); // widened
});

test("presets are what they claim", () => {
  assert.equal(DEFAULT_PERMISSIONS.text, true);
  assert.equal(DEFAULT_PERMISSIONS.textColor, false); // content only
  assert.equal(ALL_PERMISSIONS.colorRange, "any");
  assert.equal(ALL_PERMISSIONS.spacingRange, "any");
});

test("the owner's permissions allow every slot", () => {
  for (const slot of [textSlot, richSlot, accentSlot, textColorSlot, listSlot]) {
    const value = slot.type === "list" ? ["a"] : slot.type === "color" ? "#123456" : "text";
    assert.equal(validate(slot, value, ALL_PERMISSIONS).ok, true, `slot ${slot.id}`);
  }
});
