"use client";

// An inline-editable text node. Uncontrolled contentEditable: initial value is
// rendered once and committed on blur, so React re-renders never disturb the caret.
//
// Each text node also carries its own optional colour, so two headings in the
// same section can differ. The colour control only appears when the site's
// permissions allow it — see EditorContext.

import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { useEditorCapabilities } from "./EditorContext";

export function EditableText({
  slotId,
  initial,
  editable,
  color,
  as = "span",
  className = "",
  style,
  onEdit,
}: {
  slotId: string;
  initial: string;
  editable: boolean;
  /** This slot's own colour. Unset means inherit from the section. */
  color?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
  className?: string;
  style?: React.CSSProperties;
  onEdit?: (slotId: string, value: string) => void;
}) {
  // Committed value: rendered once on mount, then updated only on blur — so React
  // re-renders never disturb the caret in the uncontrolled contentEditable.
  const [startValue, setStartValue] = useState(initial);
  // ...but an *external* change (undo, redo, a reload of the draft) has to show.
  // Tracking the last prop we saw distinguishes the two: while typing, the prop
  // still holds the last committed text and matches `startValue`, so nothing
  // syncs and the caret is untouched. After an undo the prop differs, and the
  // node re-renders with the restored text.
  const [seenProp, setSeenProp] = useState(initial);
  if (initial !== seenProp) {
    setSeenProp(initial);
    setStartValue(initial);
  }
  const [picking, setPicking] = useState(false);
  const caps = useEditorCapabilities();
  const Tag = as;

  // The slot's own colour wins over whatever the section set.
  const styled: React.CSSProperties | undefined = color ? { ...style, color } : style;

  if (!editable) {
    return (
      <Tag className={className} style={styled}>
        {initial}
      </Tag>
    );
  }

  const field = (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-slot-id={slotId}
      style={styled}
      className={`${className} rounded-sm outline-none transition hover:bg-yellow-100/40 focus:bg-yellow-100/60 focus:ring-2 focus:ring-yellow-400`}
      onBlur={(e) => {
        const value = e.currentTarget.textContent ?? "";
        if (value !== startValue) {
          setStartValue(value);
          onEdit?.(slotId, value);
        }
      }}
    >
      {startValue}
    </Tag>
  );

  if (!caps.canEditTextColor || !caps.onEditColor) return field;

  return (
    // `group` reveals the swatch on hover/focus so the page isn't peppered with
    // controls; it stays visible while the picker is open.
    <span className="group relative inline-block">
      {field}
      <button
        type="button"
        title="Text colour"
        aria-label="Change text colour"
        onClick={() => setPicking((p) => !p)}
        className={`ml-1 inline-block h-4 w-4 shrink-0 translate-y-0.5 rounded border border-slate-400 align-middle transition ${
          picking ? "opacity-100 ring-2 ring-slate-900/20" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
        style={{ backgroundColor: color || "transparent" }}
      />
      {picking ? (
        <ColorPicker
          value={color}
          range={caps.colorRange}
          onChange={(c) => {
            caps.onEditColor?.(slotId, c);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </span>
  );
}
