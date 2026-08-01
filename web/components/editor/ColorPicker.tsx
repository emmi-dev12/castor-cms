"use client";

// Colour picker for a single piece of text.
//
// When the site allows any colour, the swatch is a native <input type="color">.
// On macOS that opens the real system colour panel — spectrum, sliders, RGB and
// hex fields, the eyedropper, saved swatches — which is both better than
// anything hand-rolled and free. A hex field sits alongside for typing exact
// values, and the site palette is offered as one-click shortcuts.
//
// When the site is limited to the palette, only the swatches are offered: the
// Guardian would reject anything else, so showing a full picker would be a lie.

import { useEffect, useRef, useState } from "react";
import { ALLOWED_PALETTE } from "@/lib/guardian/policy";
import type { Permissions } from "@/lib/model/types";

/** Expand #abc to #aabbcc — <input type="color"> only accepts the long form. */
function toLongHex(value: string | undefined): string {
  const v = (value ?? "").trim();
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#0f172a";
}

export function ColorPicker({
  value,
  range,
  onChange,
  onClose,
}: {
  /** Current colour, or undefined when the text inherits. */
  value?: string;
  range: Permissions["colorRange"];
  onChange: (color: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState(value ?? "");

  // Dismiss on outside click or Escape, like any other popover.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function commitHex(raw: string) {
    const v = raw.trim();
    if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-300 bg-white p-3 shadow-lg"
      // Keep clicks inside from bubbling out to the text element behind it.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {range === "any" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Pick a colour"
            value={toLongHex(value)}
            onChange={(e) => {
              setHex(e.target.value);
              onChange(e.target.value);
            }}
            className="h-9 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
          />
          <input
            type="text"
            aria-label="Hex colour"
            value={hex}
            placeholder="#1e40af"
            spellCheck={false}
            onChange={(e) => setHex(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHex((e.target as HTMLInputElement).value);
            }}
            className="w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-800"
          />
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-500">This site uses a set palette.</p>
      )}

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {ALLOWED_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Use ${c}`}
            onClick={() => {
              setHex(c);
              onChange(c);
            }}
            className={`h-7 w-7 rounded border ${
              (value ?? "").toLowerCase() === c.toLowerCase()
                ? "border-slate-900 ring-2 ring-slate-900/20"
                : "border-slate-300"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange(null)}
        className="mt-3 w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        Reset to default
      </button>
    </div>
  );
}
