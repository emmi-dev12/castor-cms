"use client";

// A working miniature of the real editor: the same chrome, the same yellow
// editable highlight, the same permission switches. Type in the page and it
// changes; try a change the permissions forbid and the Guardian refuses it,
// exactly as it would on a live site. Nothing is saved anywhere — this is a
// demo, not a session.

import { useRef, useState } from "react";

/** Mirrors the real switches: whether colours may change, and how far. */
const MODES = [
  { id: "off", label: "No colours", note: "Words and pictures only." },
  { id: "palette", label: "Palette only", note: "Colours, but only yours." },
  { id: "any", label: "Any colour", note: "The full picker." },
] as const;

type Mode = (typeof MODES)[number]["id"];

// The palette an owner would hand a client, in the editor's own swatch style.
const PALETTE = ["#0f172a", "#1d4ed8", "#047857", "#b91c1c"];
const OFF_PALETTE = "#ec4899"; // deliberately not in the palette above

export function EditorDemo() {
  const [mode, setMode] = useState<Mode>("off");
  const [accent, setAccent] = useState(PALETTE[0]!);
  const [status, setStatus] = useState<{ tone: "ok" | "blocked"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(tone: "ok" | "blocked", text: string) {
    setStatus({ tone, text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), 2600);
  }

  // Mirrors lib/guardian: the colour permission gates any change at all, and
  // colorRange decides whether off-palette values are allowed.
  function tryColour(value: string, inPalette: boolean) {
    if (mode === "off") {
      say("blocked", "Blocked — colours aren’t editable on this site.");
      return;
    }
    if (!inPalette && mode !== "any") {
      say("blocked", "Blocked — that colour isn’t in the palette.");
      return;
    }
    setAccent(value);
    say("ok", "Saved to draft.");
  }

  return (
    <figure className="demo">
      <div className="demo__chrome">
        <header className="demo__bar">
          <span className="demo__site">Northside Dental</span>
          <span className="pill pill--draft">Draft</span>
          <span className="pill">{MODES.find((m) => m.id === mode)!.label}</span>
          <span className="demo__spacer" />
          <button type="button" className="ui-btn" onClick={() => say("ok", "Preview opened.")}>
            Preview
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--solid"
            onClick={() => say("ok", "Published. Previous version kept.")}
          >
            Publish
          </button>
        </header>

        <div className="demo__body">
          <div className="demo__canvas">
            <p className="demo__hint">Click any highlighted text and type.</p>
            <div className="demo__page">
              <h3
                className="demo__h"
                style={{ color: accent }}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label="Headline"
                onBlur={() => say("ok", "Saved to draft.")}
              >
                Gentle dentistry in Northside
              </h3>
              <p
                className="demo__p"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label="Body text"
                onBlur={() => say("ok", "Saved to draft.")}
              >
                Same-day appointments, and a team that explains what it&rsquo;s doing before it
                does it.
              </p>
              <span className="demo__cta" style={{ backgroundColor: accent }}>
                Book a visit
              </span>
            </div>
          </div>

          <aside className="demo__panel">
            <p className="demo__panel-title">Colour permission</p>
            <div className="demo__tiers">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`demo__tier ${m.id === mode ? "is-on" : ""}`}
                  aria-pressed={m.id === mode}
                  onClick={() => {
                    setMode(m.id);
                    setStatus(null);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="demo__panel-note">{MODES.find((m) => m.id === mode)!.note}</p>

            <p className="demo__panel-title">Accent colour</p>
            <div className="demo__swatches">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use palette colour ${c}`}
                  className={`demo__swatch ${accent === c ? "is-on" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => tryColour(c, true)}
                />
              ))}
              <button
                type="button"
                aria-label="Use a colour outside the palette"
                className={`demo__swatch demo__swatch--off ${accent === OFF_PALETTE ? "is-on" : ""}`}
                style={{ backgroundColor: OFF_PALETTE }}
                onClick={() => tryColour(OFF_PALETTE, false)}
              />
            </div>
            <p className="demo__panel-note">
              The last swatch isn&rsquo;t in the palette — only &ldquo;any colour&rdquo; allows it.
            </p>
          </aside>
        </div>

        <div className="demo__status" role="status">
          {status ? (
            <span className={status.tone === "ok" ? "is-ok" : "is-blocked"}>{status.text}</span>
          ) : (
            <span className="is-idle">Every change is checked before it reaches the draft.</span>
          )}
        </div>
      </div>
      <figcaption className="demo__cap">
        A miniature of the real editor. Your client sees this; you set the permissions.
      </figcaption>
    </figure>
  );
}
