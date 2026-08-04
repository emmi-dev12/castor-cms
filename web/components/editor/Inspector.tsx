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
import { BG_IMAGE_LABEL } from "@/lib/model/types";
import type { LinkValue, Page, Permissions, Slot } from "@/lib/model/types";

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

/** Inline swatches for one element's own colour (text or a button background) —
 *  a separate permission from the section's colours, so it gets its own control. */
function ColourSwatches({
  heading,
  value,
  range,
  onPick,
}: {
  heading: string;
  value?: string;
  range: Permissions["colorRange"];
  onPick: (color: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-700">{heading}</p>
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
  onEditBackground,
}: {
  selection: Selection | null;
  page: Page;
  permissions: Permissions;
  onEdit: (slotId: string, value: Slot["value"]) => void;
  onEditColor: (slotId: string, color: string | null) => void;
  /** Set (`src`) or clear (`null`) the selected section's background image. */
  onEditBackground: (sectionId: string, src: string | null) => void;
}) {
  const section = selection ? page.sections.find((s) => s.id === selection.sectionId) : undefined;
  const slot: Slot | undefined =
    section && selection?.slotId
      ? section.slots.find((s) => s.id === selection.slotId)
      : undefined;

  if (!selection || !section) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs leading-relaxed text-slate-500">
        Click anything on the page to edit it. Type to change words; colours,
        links and spacing for what you picked show up here.
      </p>
    );
  }

  const isText = slot?.type === "text" || slot?.type === "richtext";
  const textColour = isText ? (slot as { color?: string }).color : undefined;

  const isLink = slot?.type === "link" || slot?.type === "button";
  const linkValue = isLink ? (slot as { value: LinkValue }).value : undefined;
  const buttonColour = isLink ? (slot as { color?: string }).color : undefined;

  // The section's own design slots the client may change.
  const sectionColours = section.slots.filter((s) => {
    if (s.type !== "color") return false;
    const cap = capabilityFor(s);
    return cap !== null && permissions[cap];
  });
  const sectionSpaces = section.slots.filter((s) => s.type === "space" && permissions.spacing);

  // The section's background image (if any) — a section-wide design choice, so
  // it's offered whenever the client may change section colours.
  const bgSlot = section.slots.find((s) => s.label === BG_IMAGE_LABEL && s.type === "image");
  const bgSrc = bgSlot && bgSlot.type === "image" ? bgSlot.value.src : "";
  const canBackground = permissions.sectionColors;

  const selectedName = slot
    ? humanize(slot.label ?? slot.type)
    : `${section.type} section`;

  const hasSectionControls = sectionColours.length > 0 || sectionSpaces.length > 0 || canBackground;
  const nothing =
    !(isText && permissions.textColor) &&
    !(isLink && (permissions.links || permissions.sectionColors)) &&
    !hasSectionControls;

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
            <ColourSwatches
              heading="This text"
              value={textColour}
              range={permissions.colorRange}
              onPick={(c) => onEditColor(slot.id, c)}
            />
          ) : null}

          {isLink && linkValue && slot ? (
            <div className="space-y-3">
              {permissions.links ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Link opens</span>
                  <input
                    key={slot.id}
                    defaultValue={linkValue.href}
                    placeholder="https://…  ·  /page  ·  #section"
                    spellCheck={false}
                    onBlur={(e) => {
                      const href = e.target.value.trim();
                      if (href !== linkValue.href) onEdit(slot.id, { text: linkValue.text, href });
                    }}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-800"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    The button&rsquo;s words are edited by clicking it on the page.
                  </span>
                </label>
              ) : null}
              {permissions.sectionColors ? (
                <ColourSwatches
                  heading="Button colour"
                  value={buttonColour}
                  range={permissions.colorRange}
                  onPick={(c) => onEditColor(slot.id, c)}
                />
              ) : null}
            </div>
          ) : null}

          {hasSectionControls && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700">This section</p>

              {canBackground ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Background image</span>
                    {bgSrc ? (
                      <button
                        type="button"
                        onClick={() => onEditBackground(section.id, null)}
                        className="text-xs text-slate-500 underline hover:text-slate-800"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {bgSrc ? (
                    <div
                      className="mb-2 h-16 w-full rounded border border-slate-200 bg-cover bg-center"
                      style={{ backgroundImage: `url("${bgSrc.replace(/"/g, "%22")}")` }}
                    />
                  ) : null}
                  <input
                    key={section.id + bgSrc}
                    defaultValue={bgSrc}
                    placeholder="Paste an image URL"
                    spellCheck={false}
                    onBlur={(e) => {
                      const src = e.target.value.trim();
                      if (src !== bgSrc) onEditBackground(section.id, src || null);
                    }}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
              ) : null}

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
