"use client";

// A short guided tour of the editor for non-technical clients. Auto-opens the
// first time someone opens a given site's editor, and is reopenable forever
// from the Help button.
//
// Steps point at real UI via data-tour attributes. A step whose target isn't on
// the page (e.g. the Pages panel on a single-page site) is skipped rather than
// pointing at nothing — so the tour always matches what the client can see.
//
// "Seen" state lives in localStorage per slug: it's a UI preference, not site
// data, so it doesn't belong in the shared database (and a client opening the
// editor on a new device arguably *should* get the tour again).

import { useCallback, useEffect, useMemo, useState } from "react";

export interface TourStep {
  /** data-tour value to highlight. Omit for a centred, targetless step. */
  target?: string;
  title: string;
  body: string;
}

const PAD = 8;

function seenKey(slug: string) {
  return `castor:tour-seen:${slug}`;
}

// The parent remounts this per run (via `key`), so `i` starts at 0 naturally —
// no reset-on-open effect needed.
export function Walkthrough({
  slug,
  steps,
  open,
  onClose,
}: {
  slug: string;
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Only keep steps whose target actually exists right now.
  const live = useMemo(() => {
    if (typeof document === "undefined") return steps;
    return steps.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`));
  }, [steps, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = live[i];

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    if (el) {
      // Centring a target taller than the viewport (the page preview) would
      // scroll the client into the middle of their page. Show its top instead.
      const tall = el.getBoundingClientRect().height > window.innerHeight * 0.8;
      el.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
    }
    // Measure after the smooth scroll has had a moment to settle.
    const t = setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(seenKey(slug), "1");
    } catch {
      /* private mode — the tour simply reappears next time */
    }
    onClose();
  }, [slug, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, live.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, live.length]);

  if (!open || !step) return null;

  const last = i === live.length - 1;

  // Place the card under the highlight when there's room, otherwise above it.
  const cardStyle: React.CSSProperties = rect
    ? (() => {
        const below = rect.bottom + 16;
        const roomBelow = window.innerHeight - rect.bottom > 220;
        return {
          top: roomBelow ? below : Math.max(16, rect.top - 210),
          left: Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - 360)),
        };
      })()
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight: the ring sits on the target and its huge outer shadow dims
          everything else, so we never need to punch a real hole. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-white transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/62" />
      )}

      <div
        className="absolute w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
        style={cardStyle}
        role="dialog"
        aria-label="Editor walkthrough"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Step {i + 1} of {live.length}
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-400 underline hover:text-slate-700"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setI(i + 1))}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True if this browser has never completed the tour for this site. */
export function shouldAutoOpenTour(slug: string): boolean {
  try {
    return localStorage.getItem(seenKey(slug)) !== "1";
  } catch {
    return false;
  }
}
