"use client";

// Renders an imported page inside a sandboxed iframe.
//
// `sandbox="allow-scripts"` WITHOUT `allow-same-origin` puts the imported site
// in an opaque origin. Its own JavaScript runs — which is why menus, sliders
// and carousels survive an import — but it cannot read cookies, reach the
// editor, or touch another client's site on the same domain.
//
// The price of that isolation is that this component can't script into the
// frame. Instead the frame carries an injected bridge (lib/import/bridge.ts)
// that reports edits outward via postMessage; everything it sends is validated
// server-side by the Guardian, exactly like an ordinary edit.

import { useEffect, useRef, useState } from "react";
import type { EditFn, EditImageFn } from "./SectionView";

export function ImportedSection({
  siteSlug,
  pagePath,
  editable,
  onEdit,
  onEditImage,
}: {
  siteSlug: string;
  pagePath: string;
  editable: boolean;
  onEdit?: EditFn;
  onEditImage?: EditImageFn;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);

  const src = `/frame/${siteSlug}${pagePath ? `/${pagePath}` : ""}${editable ? "?edit=1" : ""}`;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // The frame is an opaque origin, so the origin string is "null" and
      // useless for authentication. Identify it by the window that sent it.
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const data = e.data as
        | { __castor?: true; type?: string; slotId?: string; value?: string; src?: string; alt?: string; height?: number }
        | null;
      if (!data || data.__castor !== true) return;

      // Height applies in both modes; editing messages only when editable.
      if (data.type === "height" && typeof data.height === "number") {
        // Clamped: a page that reports a silly height shouldn't blow up the UI.
        setHeight(Math.min(Math.max(data.height, 200), 20000));
      } else if (!editable) {
        return;
      } else if (data.type === "text" && data.slotId) {
        onEdit?.(data.slotId, data.value ?? "");
      } else if (data.type === "image" && data.slotId) {
        onEditImage?.(data.slotId, { src: data.src ?? "", alt: data.alt ?? "" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editable, onEdit, onEditImage]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title="Imported page"
      // No allow-same-origin: that is the whole isolation guarantee.
      sandbox="allow-scripts allow-forms allow-popups"
      className="w-full border-0"
      style={{ height }}
    />
  );
}
