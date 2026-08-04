"use client";

// Renders a full page (its ordered sections). Used by both the public view and
// the editor; `editable` toggles inline editing. When `admin` controls are
// passed (owner master editor only), each section also gets a
// move/duplicate/delete toolbar plus an "add section" affordance.
//
// In the editor, clicking anything selects it: a text node, or (clicking empty
// space) the section itself. The selection is outlined, and the sidebar
// Inspector shows the controls for whatever's selected. Clicking a text node
// still places the caret to type — selecting and editing are the same gesture.

import { useEffect, useRef } from "react";
import { AddSectionMenu } from "@/components/editor/AddSectionMenu";
import type { Selection } from "@/components/editor/Inspector";
import type { Page } from "@/lib/model/types";
import { SectionView, type EditFn, type EditImageFn } from "./SectionView";

export interface AdminSectionControls {
  onMove: (sectionId: string, dir: "up" | "down") => void;
  onDuplicate: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onAddAfter: (afterSectionId: string | undefined, type: string) => void;
}

export function SiteView({
  page,
  editable,
  selection,
  onSelect,
  onEdit,
  onEditImage,
  admin,
  siteSlug,
}: {
  page: Page;
  editable: boolean;
  selection?: Selection | null;
  onSelect?: (sel: Selection) => void;
  onEdit?: EditFn;
  onEditImage?: EditImageFn;
  admin?: AdminSectionControls;
  /** Passed to `form` sections so they know where to POST submissions. */
  siteSlug?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Outline the selected element imperatively — SectionView renders arbitrary
  // markup, so reaching the exact node by its slot id after render is simpler
  // than threading a "selected" flag through every section type.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll(".castor-selected").forEach((el) => el.classList.remove("castor-selected"));
    if (selection?.slotId) {
      const el = root.querySelector(`[data-slot-id="${CSS.escape(selection.slotId)}"]`);
      el?.classList.add("castor-selected");
    }
  }, [selection]);

  if (!editable) {
    return (
      <div className="bg-white text-slate-900">
        {page.sections.map((section) => (
          <SectionView
            key={section.id}
            section={section}
            editable={false}
            onEdit={onEdit}
            onEditImage={onEditImage}
            siteSlug={siteSlug}
            pagePath={page.path}
          />
        ))}
      </div>
    );
  }

  const btn =
    "rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm ring-1 ring-slate-300 hover:bg-white disabled:opacity-40";
  const last = page.sections.length - 1;

  return (
    <div ref={rootRef} className="bg-white text-slate-900">
      {admin && page.sections.length === 0 && (
        <div className="py-8">
          <AddSectionMenu onAdd={(type) => admin.onAddAfter(undefined, type)} />
        </div>
      )}

      {page.sections.map((section, i) => {
        const sectionSelected = selection?.sectionId === section.id && !selection?.slotId;
        return (
          <div
            key={section.id}
            className={`group relative ${admin ? "border-b border-dashed border-slate-100" : ""}`}
            // Click resolves to the nearest editable slot, or the section itself.
            onClick={(e) => {
              if (!onSelect) return;
              const slotEl = (e.target as HTMLElement).closest("[data-slot-id]");
              onSelect({
                sectionId: section.id,
                slotId: slotEl?.getAttribute("data-slot-id") ?? undefined,
              });
            }}
          >
            {/* Section outline: subtle on hover, firm when the section itself is
                selected (i.e. the background was clicked, not a child). */}
            <div
              className={`pointer-events-none absolute inset-0 z-20 rounded-sm ring-2 transition ${
                sectionSelected ? "ring-slate-900/60" : "ring-transparent group-hover:ring-slate-900/10"
              }`}
            />

            {admin && (
              <div
                className="absolute right-3 top-3 z-30 hidden items-center gap-1 group-hover:flex"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="rounded-md bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">
                  {section.type}
                </span>
                <button type="button" className={btn} title="Move up" disabled={i === 0} onClick={() => admin.onMove(section.id, "up")}>
                  ↑
                </button>
                <button type="button" className={btn} title="Move down" disabled={i === last} onClick={() => admin.onMove(section.id, "down")}>
                  ↓
                </button>
                <button type="button" className={btn} title="Duplicate" onClick={() => admin.onDuplicate(section.id)}>
                  ⧉
                </button>
                <button type="button" className={`${btn} text-red-600`} title="Delete section" onClick={() => admin.onDelete(section.id)}>
                  🗑
                </button>
              </div>
            )}

            <SectionView
              section={section}
              editable={editable}
              onEdit={onEdit}
              onEditImage={onEditImage}
              siteSlug={siteSlug}
              pagePath={page.path}
            />

            {admin && (
              <div className="py-2" onClick={(e) => e.stopPropagation()}>
                <AddSectionMenu onAdd={(type) => admin.onAddAfter(section.id, type)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
