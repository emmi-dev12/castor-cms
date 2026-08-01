"use client";

// Cross-cutting editor capabilities, provided once by EditorApp and consumed
// deep in the section tree (EditableText). A context rather than props because
// text colour is a per-element concern: threading it would mean touching every
// section renderer and every intermediate component that never uses it.
//
// The default is inert, so the public renderer — which never mounts a provider
// — behaves exactly as before.

import { createContext, useContext } from "react";
import type { Permissions } from "@/lib/model/types";

export interface EditorCapabilities {
  /** May the current user recolour individual text? */
  canEditTextColor: boolean;
  /** Full picker, or only the site's palette. */
  colorRange: Permissions["colorRange"];
  /** Persist a text slot's colour. `null` clears it back to inherited. */
  onEditColor?: (slotId: string, color: string | null) => void;
}

const INERT: EditorCapabilities = { canEditTextColor: false, colorRange: "palette" };

const Ctx = createContext<EditorCapabilities>(INERT);

export const EditorCapabilitiesProvider = Ctx.Provider;

export function useEditorCapabilities(): EditorCapabilities {
  return useContext(Ctx);
}
