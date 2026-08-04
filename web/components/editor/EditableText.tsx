"use client";

// An inline-editable text node. Uncontrolled contentEditable: initial value is
// rendered once and committed on blur, so React re-renders never disturb the caret.
//
// Each text node carries its own optional colour (so two headings in one section
// can differ). Colour is picked in the sidebar Inspector when this node is
// selected, not here — this component only renders the words and applies the
// colour it's given.

import { useState } from "react";

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

  return (
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
}
