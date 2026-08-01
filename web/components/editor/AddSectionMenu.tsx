"use client";

// A small "+ Add section" control with a dropdown of the available section
// types. Used by the admin editor between/after sections.

import { useState } from "react";
import { SECTION_TYPES } from "@/lib/model/sectionTemplates";

export function AddSectionMenu({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-500 hover:text-slate-800"
      >
        + Add section
      </button>
      {open && (
        <div className="absolute top-8 z-20 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {SECTION_TYPES.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => {
                setOpen(false);
                onAdd(s.type);
              }}
              className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
