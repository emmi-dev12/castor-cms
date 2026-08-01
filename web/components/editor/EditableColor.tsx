"use client";

// Section-wide colour control for the Design panel, driven by permissions:
// - sectionColors off  -> shown disabled
// - colorRange palette -> the site's swatches only
// - colorRange any     -> swatches plus the native picker

import { ALLOWED_PALETTE } from "@/lib/guardian/policy";
import type { Permissions } from "@/lib/model/types";

export function EditableColor({
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
  const locked = !permissions.sectionColors;
  const current = value.toLowerCase();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium capitalize text-slate-700">{label}</span>
        <span
          className="h-4 w-4 rounded-full border border-slate-300"
          style={{ backgroundColor: value }}
        />
      </div>

      {locked ? (
        <p className="text-xs text-slate-400">Section colours aren&rsquo;t editable here.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {ALLOWED_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onEdit(slotId, c)}
              className={`h-6 w-6 rounded-full border transition ${
                current === c.toLowerCase()
                  ? "ring-2 ring-slate-900 ring-offset-1"
                  : "border-slate-300 hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {permissions.colorRange === "any" && (
            <label
              className="ml-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 text-xs text-slate-500"
              title="Custom color"
            >
              +
              <input
                type="color"
                className="sr-only"
                value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
                onChange={(e) => onEdit(slotId, e.target.value)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
