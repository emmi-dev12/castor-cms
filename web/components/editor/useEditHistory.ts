"use client";

// Undo/redo for slot edits.
//
// The stack holds before/after snapshots of individual slots rather than whole
// drafts: a draft snapshot per keystroke would be wasteful, and replaying one
// slot is enough because every edit is a slot edit.
//
// `touchesColor` matters more than it looks. Text value and text colour are
// separate permissions, so an undo of a *typing* change must not send a colour
// field — a client allowed to edit text but not colour would have the whole
// undo refused by the Guardian. Only a colour change replays colour.
//
// The stack lives in a ref, not state: undo() has to return the entry to the
// caller synchronously, and a state updater isn't guaranteed to have run by the
// time the call returns. A version counter drives re-renders for the buttons.

import { useCallback, useRef, useState } from "react";
import type { Slot } from "@/lib/model/types";

export interface SlotSnapshot {
  value: Slot["value"];
  /** Undefined means the text inherits its colour. */
  color?: string;
}

export interface HistoryEntry {
  slotId: string;
  before: SlotSnapshot;
  after: SlotSnapshot;
  /** Whether this edit changed the colour (and so whether replay should). */
  touchesColor: boolean;
}

/** Bounded so a long editing session can't grow memory without limit. */
const MAX_ENTRIES = 100;

export function useEditHistory() {
  // `index` is how many entries are currently applied; everything at or after
  // it has been undone and is available to redo.
  const stack = useRef<{ entries: HistoryEntry[]; index: number }>({ entries: [], index: 0 });
  // The ref is the source of truth; these mirror it for rendering, because the
  // ref must not be read during render.
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });
  const rerender = useCallback(() => {
    const s = stack.current;
    setFlags({ canUndo: s.index > 0, canRedo: s.index < s.entries.length });
  }, []);

  const record = useCallback(
    (entry: HistoryEntry) => {
      const s = stack.current;
      // A fresh edit after undoing discards the redo tail, as in every editor.
      const entries = [...s.entries.slice(0, s.index), entry].slice(-MAX_ENTRIES);
      stack.current = { entries, index: entries.length };
      rerender();
    },
    [rerender],
  );

  /** The entry to reverse, or null. The caller applies its `before`. */
  const undo = useCallback((): HistoryEntry | null => {
    const s = stack.current;
    if (s.index === 0) return null;
    const entry = s.entries[s.index - 1]!;
    stack.current = { entries: s.entries, index: s.index - 1 };
    rerender();
    return entry;
  }, [rerender]);

  /** The entry to reapply, or null. The caller applies its `after`. */
  const redo = useCallback((): HistoryEntry | null => {
    const s = stack.current;
    if (s.index >= s.entries.length) return null;
    const entry = s.entries[s.index]!;
    stack.current = { entries: s.entries, index: s.index + 1 };
    rerender();
    return entry;
  }, [rerender]);

  /** Drop everything — e.g. when switching to a different page. */
  const reset = useCallback(() => {
    stack.current = { entries: [], index: 0 };
    rerender();
  }, [rerender]);

  return {
    record,
    undo,
    redo,
    reset,
    canUndo: flags.canUndo,
    canRedo: flags.canRedo,
  };
}
