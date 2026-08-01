// Token substitution for cloned (`raw-html`) sections.
// At ingest, each editable element's content/src/alt is replaced with a token
// DELIM+key+DELIM. At render, we swap tokens for the current slot values — done
// on the string so the server-rendered HTML is already correct (no JS needed).

import type { ImageValue, Slot } from "../model/types";

/** Private-use code point (U+E000); won't occur in real page content. */
export const TOKEN_DELIM = String.fromCharCode(0xe000);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

const tok = (key: string) => `${TOKEN_DELIM}${key}${TOKEN_DELIM}`;

/** Replace every slot's tokens in the template with the current values. */
export function applySlots(template: string, slots: Slot[]): string {
  let out = template;
  for (const slot of slots) {
    if (slot.type === "text") {
      out = out.split(tok(slot.id)).join(escapeHtml(slot.value as string));
    } else if (slot.type === "image") {
      const v = slot.value as ImageValue;
      out = out.split(tok(`${slot.id}#src`)).join(escapeAttr(v.src));
      out = out.split(tok(`${slot.id}#alt`)).join(escapeAttr(v.alt));
    }
  }
  return out;
}
