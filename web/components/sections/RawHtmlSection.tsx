"use client";

// Renders a cloned (`raw-html`) section: the captured <head> styles plus the
// frozen body HTML with the current slot values substituted in (so the
// server-rendered output is correct without JS).
//
// The body HTML is rendered ONCE (memoized on section.id) so React never
// re-sets innerHTML — that would wipe the contentEditable handlers we attach
// imperatively. Value updates (image swaps, AI edits) are applied to the DOM
// imperatively instead, skipping the element the user is actively editing.

import { useEffect, useMemo, useRef } from "react";
import type { EditFn, EditImageFn } from "./SectionView";
import { applySlots } from "@/lib/ingest/tokens";
import type { ImageValue, Section } from "@/lib/model/types";

export function RawHtmlSection({
  section,
  editable,
  onEdit,
  onEditImage,
}: {
  section: Section;
  editable: boolean;
  onEdit?: EditFn;
  onEditImage?: EditImageFn;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Substitute values once at mount; keep innerHTML stable across edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialHtml = useMemo(() => applySlots(section.template ?? "", section.slots), [section.id]);

  // Attach editing handlers once.
  useEffect(() => {
    if (!editable) return;
    const root = ref.current;
    if (!root) return;
    const cleanups: (() => void)[] = [];

    for (const slot of section.slots) {
      const el = root.querySelector<HTMLElement>(`[data-slot-id="${slot.id}"]`);
      if (!el) continue;

      if (slot.type === "image" && el instanceof HTMLImageElement) {
        el.style.cursor = "pointer";
        el.style.outline = "2px solid transparent";
        const onClick = (e: Event) => {
          e.preventDefault();
          onEditImage?.(slot.id, slot.value as ImageValue);
        };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      } else if (slot.type === "text") {
        el.setAttribute("contenteditable", "true");
        el.style.borderRadius = "2px";
        el.style.outline = "2px solid transparent";
        const onFocus = () => (el.style.outline = "2px solid #facc15");
        const onBlur = () => {
          el.style.outline = "2px solid transparent";
          const text = el.textContent ?? "";
          onEdit?.(slot.id, text);
        };
        el.addEventListener("focus", onFocus);
        el.addEventListener("blur", onBlur);
        cleanups.push(() => {
          el.removeEventListener("focus", onFocus);
          el.removeEventListener("blur", onBlur);
        });
      }
    }
    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, editable]);

  // Apply current slot values imperatively (image swaps etc.) without wiping the
  // caret of a text element the user is currently editing.
  const valuesKey = JSON.stringify(section.slots);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const slot of section.slots) {
      const el = root.querySelector<HTMLElement>(`[data-slot-id="${slot.id}"]`);
      if (!el) continue;
      if (slot.type === "image" && el instanceof HTMLImageElement) {
        const v = slot.value as ImageValue;
        el.src = v.src;
        el.alt = v.alt;
        if (v.width) {
          el.style.width = v.width;
          el.style.maxWidth = "100%";
        } else {
          el.style.width = "";
        }
      } else if (slot.type === "text" && document.activeElement !== el) {
        el.textContent = slot.value as string;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  return (
    <div ref={ref}>
      {section.head ? <div dangerouslySetInnerHTML={{ __html: section.head }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: initialHtml }} />
    </div>
  );
}
