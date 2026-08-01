"use client";

// Section padding control for the Design panel, driven by permissions:
// - spacing off         -> shown disabled
// - spacingRange scale  -> the preset scale only
// - spacingRange any    -> the scale plus a free-text length

import { SPACING_SCALE } from "@/lib/guardian/policy";
import type { Permissions } from "@/lib/model/types";

export function EditableSpace({
  slotId,
  label,
  value,
  permissions,
  onEdit,
}: {
  slotId: string;
  label: string;
  value: string;
  permissions: Permissions;
  onEdit: (slotId: string, value: string) => void;
}) {
  const locked = !permissions.spacing;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium capitalize text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{value}</span>
      </div>

      {locked ? (
        <p className="text-xs text-slate-400">Spacing isn&rsquo;t editable here.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {SPACING_SCALE.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onEdit(slotId, s.value)}
              className={`rounded-md border px-2 py-1 text-xs transition ${
                value.trim() === s.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
          {permissions.spacingRange === "any" && (
            <input
              type="text"
              defaultValue={value}
              placeholder="e.g. 80px"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== value) onEdit(slotId, v);
              }}
              className="ml-1 w-16 rounded-md border border-dashed border-slate-400 px-1 py-1 text-xs"
            />
          )}
        </div>
      )}
    </div>
  );
}
