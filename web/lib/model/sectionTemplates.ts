// Default templates for each typed section, used by the admin editor's
// "add section" action. Every call produces fresh slot/section ids so a new
// section (or a duplicated one) never collides with existing slots.

import { newId } from "./content";
import type { Section, Slot } from "./types";

/** Section types the admin can add, with a human label for the menu. */
export const SECTION_TYPES: { type: string; label: string }[] = [
  { type: "hero", label: "Hero" },
  { type: "text", label: "Text (optionally + image)" },
  { type: "features", label: "Features / stats (3 cards)" },
  { type: "testimonials", label: "Testimonials (3 cards)" },
  { type: "faq", label: "FAQ (accordion)" },
  { type: "gallery", label: "Gallery (up to 4 images)" },
  { type: "form", label: "Contact form" },
  { type: "cta", label: "Call to action" },
  { type: "footer", label: "Footer" },
];

const t = (label: string, value: string): Slot => ({ id: newId("s"), type: "text", label, value });
const rich = (label: string, value: string): Slot => ({
  id: newId("s"),
  type: "richtext",
  label,
  value,
});
const btn = (label: string, text: string): Slot => ({
  id: newId("s"),
  type: "button",
  label,
  value: { text, href: "#" },
});
const color = (label: string, value: string): Slot => ({ id: newId("s"), type: "color", label, value });
const img = (label: string, alt: string): Slot => ({
  id: newId("s"),
  type: "image",
  label,
  value: { src: "https://placehold.co/1200x800", alt },
});

/** Build a fresh section of the given type with placeholder content. */
export function templateSection(type: string): Section {
  const id = newId("sec");
  switch (type) {
    case "hero":
      return {
        id,
        type,
        slots: [
          t("headline", "Your headline here"),
          t("subhead", "A short supporting sentence goes here."),
          btn("cta", "Get started"),
          color("accent", "#0f172a"),
          img("image", "Hero image"),
        ],
      };
    case "text":
      return {
        id,
        type,
        slots: [
          t("heading", "Section heading"),
          rich("body", "Write the section body copy here."),
          // image slot present but pointing at a placeholder — delete it in the
          // editor if you want a plain (non-split) text block.
          img("image", "Section image"),
        ],
      };
    case "features":
      return {
        id,
        type,
        slots: [
          t("heading", "Why us"),
          t("feature-one-title", "First"),
          t("feature-one-body", "Short description."),
          t("feature-two-title", "Second"),
          t("feature-two-body", "Short description."),
          t("feature-three-title", "Third"),
          t("feature-three-body", "Short description."),
        ],
      };
    case "testimonials":
      return {
        id,
        type,
        slots: [
          t("heading", "What people say"),
          rich("testimonial-one-quote", "“A great quote.”"),
          t("testimonial-one-author", "— Name, Place"),
          rich("testimonial-two-quote", "“Another great quote.”"),
          t("testimonial-two-author", "— Name, Place"),
          rich("testimonial-three-quote", "“One more quote.”"),
          t("testimonial-three-author", "— Name, Place"),
        ],
      };
    case "faq":
      return {
        id,
        type,
        slots: [
          t("heading", "Frequently asked questions"),
          t("faq-one-q", "First question?"),
          rich("faq-one-a", "The answer."),
          t("faq-two-q", "Second question?"),
          rich("faq-two-a", "The answer."),
          t("faq-three-q", "Third question?"),
          rich("faq-three-a", "The answer."),
        ],
      };
    case "gallery":
      return {
        id,
        type,
        slots: [
          t("heading", "Gallery"),
          img("image-one", "Photo 1"),
          img("image-two", "Photo 2"),
          img("image-three", "Photo 3"),
          img("image-four", "Photo 4"),
        ],
      };
    case "form":
      return {
        id,
        type,
        slots: [
          t("heading", "Get in touch"),
          t("intro", "Send us a message and we’ll get back to you."),
          t("field-name-label", "Name"),
          t("field-email-label", "Email"),
          t("field-message-label", "Message"),
          t("submit-label", "Send"),
          t("success", "Thanks — we’ll be in touch."),
          color("accent", "#0f172a"),
        ],
      };
    case "cta":
      return {
        id,
        type,
        slots: [t("heading", "Ready to start?"), btn("button", "Get started"), color("bg", "#0f172a")],
      };
    case "footer":
      return { id, type, slots: [t("text", "© Your company. All rights reserved.")] };
    default:
      return { id, type: "text", slots: [t("heading", "New section"), rich("body", "…")] };
  }
}
