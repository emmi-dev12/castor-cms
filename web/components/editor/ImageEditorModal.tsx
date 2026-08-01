"use client";

// Modal for editing an image slot: paste an image URL, set alt text, and choose
// a display size. On save it hands the new {src, alt, width} back to the caller,
// which routes it through the Guardian.

import { useState } from "react";
import type { ImageValue } from "@/lib/model/types";

export function ImageEditorModal({
  slotId,
  value,
  onSave,
  onClose,
}: {
  slotId: string;
  value: ImageValue;
  onSave: (slotId: string, value: ImageValue) => void;
  onClose: () => void;
}) {
  const [src, setSrc] = useState(value.src);
  const [alt, setAlt] = useState(value.alt);
  const [width, setWidth] = useState(value.width ?? "");

  const SIZES: { label: string; value: string }[] = [
    { label: "25%", value: "25%" },
    { label: "50%", value: "50%" },
    { label: "75%", value: "75%" },
    { label: "Full", value: "" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-slate-900">Edit image</h2>

        {src ? (
          <div className="mt-3 flex justify-center rounded-lg border border-slate-200 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-32 rounded object-contain" />
          </div>
        ) : null}

        <label className="mt-3 block text-xs font-medium text-slate-600">Image URL</label>
        <input
          value={src}
          autoFocus
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://…"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-slate-600">Alt text</label>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-slate-600">Display size</label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setWidth(s.value)}
              className={`rounded-md border px-2 py-1 text-xs transition ${
                (width || "") === s.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
          <input
            type="text"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="e.g. 480px"
            className="ml-1 w-20 rounded-md border border-dashed border-slate-400 px-1 py-1 text-xs"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(slotId, {
                src: src.trim(),
                alt: alt.trim(),
                ...(width.trim() ? { width: width.trim() } : {}),
              })
            }
            disabled={!src.trim()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
