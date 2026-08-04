"use client";

// The editor's properties panel. It reflects whatever the person clicked on the
// page: click a heading and its colour shows here; click a section's background
// and that section's colours and spacing show here. One place, always in sync
// with the selection — instead of an anonymous list you had to know to hunt for.
//
// Everything still flows through the Guardian: a control only appears if the
// current permissions allow that change.

import { EditableColor } from "./EditableColor";
import { EditableSpace } from "./EditableSpace";
import { ALLOWED_PALETTE, capabilityFor, isTextColorLabel } from "@/lib/guardian/policy";
import type { Page, Permissions, Slot } from "@/lib/model/types";

export interface Selection {
  sectionId: string;
  slotId?: string;
}

function humanize(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/colou?r/i, "colour")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Inline swatches for a single text node's own colour (a separate permission
 *  from the section's colours, so it gets its own control). */
function TextColour({
  value,
  range,
  onPick,
}: {
  value?: string;
  range: Permissions["colorRange"];
  onPick: (color: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-700">This text</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {ALLOWED_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Use ${c}`}
            onClick={() => onPick(c)}
            className={`h-6 w-6 rounded-full border transition ${
              (value ?? "").toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-slate-900 ring-offset-1"
                : "border-slate-300 hover:scale-110"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        {range === "any" && (
          <label
            className="ml-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 text-xs text-slate-500"
            title="Any colour"
          >
            +
            <input
              type="color"
              className="sr-only"
              value={/^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value : "#000000"}
              onChange={(e) => onPick(e.target.value)}
            />
          </label>
        )}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="mt-2 text-xs text-slate-500 underline hover:text-slate-800"
        >
          Reset to default
        </button>
      ) : null}
    </div>
  );
}

export function Inspector({
  selection,
  page,
  permissions,
  onEdit,
  onEditColor,
}: {
  selection: Selection | null;
  page: Page;
  permissions: Permissions;
  onEdit: (slotId: string, value: string) => void;
  onEditColor: (slotId: string, color: string | null) => void;
}) {
  const section = selection ? page.sections.find((s) => s.id === selection.sectionId) : undefined;
  const slot: Slot | undefined =
    section && selection?.slotId
      ? section.slots.find((s) => s.id === selection.slotId)
      : undefined;

  if (!selection || !section) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-relaxed text-slate-500">
        Click anything on the page to edit it. Type to change words; colours and
        spacing for what you picked show up here.
      </p>
    );
  }

  const isText = slot?.type === "text" || slot?.type === "richtext";
  const textColour = isText ? (slot as { color?: string }).color : undefined;

  // The section's own design slots the client may change.
  const sectionColours = section.slots.filter((s) => {
    if (s.type !== "color") return false;
    const cap = capabilityFor(s);
    return cap !== null && permissions[cap];
  });
  const sectionSpaces = section.slots.filter((s) => s.type === "space" && permissions.spacing);

  const selectedName = slot
    ? humanize(slot.label ?? slot.type)
    : `${section.type} section`;

  const nothing =
    !(isText && permissions.textColor) &&
    sectionColours.length === 0 &&
    sectionSpaces.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected</p>
        <p className="text-sm font-medium text-slate-800">{selectedName}</p>
      </div>

      {nothing ? (
        <p className="text-xs text-slate-400">Nothing to adjust for this — try clicking a heading or a section background.</p>
      ) : (
        <>
          {isText && permissions.textColor && slot ? (
            <TextColour
              value={textColour}
              range={permissions.colorRange}
              onPick={(c) => onEditColor(slot.id, c)}
            />
          ) : null}

          {(sectionColours.length > 0 || sectionSpaces.length > 0) && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700">This section</p>
              {sectionColours.map((s) => (
                <EditableColor
                  key={s.id}
                  slotId={s.id}
                  label={isTextColorLabel(s.label) ? "Text colour" : humanize(s.label ?? "colour")}
                  value={s.value as string}
                  permissions={permissions}
                  onEdit={onEdit}
                />
              ))}
              {sectionSpaces.map((s) => (
                <EditableSpace
                  key={s.id}
                  slotId={s.id}
                  label={humanize(s.label ?? "spacing")}
                  value={s.value as string}
                  permissions={permissions}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
