"use client";

// An editable image. In edit mode, clicking opens the image editor modal
// (drag/drop upload, URL, alt) via the onEditImage callback.

import type { ImageValue } from "@/lib/model/types";

export function EditableImage({
  slotId,
  value,
  editable,
  className = "",
  onEditImage,
}: {
  slotId: string;
  value: ImageValue;
  editable: boolean;
  className?: string;
  onEditImage?: (slotId: string, value: ImageValue) => void;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- content images are arbitrary remote/hotlinked URLs
    <img
      src={value.src}
      alt={value.alt}
      data-slot-id={slotId}
      style={value.width ? { width: value.width, maxWidth: "100%" } : undefined}
      className={`${className} ${editable ? "cursor-pointer ring-2 ring-transparent hover:ring-yellow-400" : ""}`}
    />
  );

  if (!editable) return img;

  return (
    <button
      type="button"
      className="block w-full appearance-none border-0 bg-transparent p-0 text-left"
      title="Click to replace this image"
      onClick={() => onEditImage?.(slotId, value)}
    >
      {img}
    </button>
  );
}
