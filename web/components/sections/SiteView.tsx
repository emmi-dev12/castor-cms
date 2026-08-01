"use client";

// Renders a full page (its ordered sections). Used by both the public view and
// the editor; `editable` toggles inline editing. When `admin` controls are
// passed (owner master editor only), each section is wrapped with a
// move/duplicate/delete toolbar plus an "add section" affordance.

import { AddSectionMenu } from "@/components/editor/AddSectionMenu";
import { SectionView, type EditFn, type EditImageFn } from "./SectionView";
import type { Page } from "@/lib/model/types";

export interface AdminSectionControls {
  onMove: (sectionId: string, dir: "up" | "down") => void;
  onDuplicate: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onAddAfter: (afterSectionId: string | undefined, type: string) => void;
}

export function SiteView({
  page,
  editable,
  onEdit,
  onEditImage,
  admin,
  siteSlug,
}: {
  page: Page;
  editable: boolean;
  onEdit?: EditFn;
  onEditImage?: EditImageFn;
  admin?: AdminSectionControls;
  /** Passed to `form` sections so they know where to POST submissions. */
  siteSlug?: string;
}) {
  if (!admin) {
    return (
      <div className="bg-white text-slate-900">
        {page.sections.map((section) => (
          <SectionView
            key={section.id}
            section={section}
            editable={editable}
            onEdit={onEdit}
            onEditImage={onEditImage}
            siteSlug={siteSlug}
          />
        ))}
      </div>
    );
  }

  const last = page.sections.length - 1;
  const btn =
    "rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm ring-1 ring-slate-300 hover:bg-white disabled:opacity-40";

  return (
    <div className="bg-white text-slate-900">
      {page.sections.length === 0 && (
        <div className="py-8">
          <AddSectionMenu onAdd={(type) => admin.onAddAfter(undefined, type)} />
        </div>
      )}
      {page.sections.map((section, i) => (
        <div key={section.id} className="group relative border-b border-dashed border-slate-100">
          <div className="pointer-events-none absolute inset-0 ring-2 ring-transparent group-hover:ring-blue-200" />
          <div className="absolute right-3 top-3 z-10 hidden items-center gap-1 group-hover:flex">
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
            <button
              type="button"
              className={`${btn} text-red-600`}
              title="Delete section"
              onClick={() => admin.onDelete(section.id)}
            >
              🗑
            </button>
          </div>

          <SectionView
            section={section}
            editable={editable}
            onEdit={onEdit}
            onEditImage={onEditImage}
            siteSlug={siteSlug}
          />

          <div className="py-2">
            <AddSectionMenu onAdd={(type) => admin.onAddAfter(section.id, type)} />
          </div>
        </div>
      ))}
    </div>
  );
}
